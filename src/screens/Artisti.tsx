import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ApiError, errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import type { Entry, Interest, Package, Regions, Studio } from '@/api/types';
import { PlayButton, Steps } from '@/components/contest';
import { Icon } from '@/components/Icon';
import { BackHeader, Btn, Card, Check, Chips, Field, IconBtn, LinkText, LogoHeader, Notice, Pill, Screen, Select, Stale, T } from '@/components/ui';
import { GENRES, REGIONS } from '@/lib/constants';
import { env } from '@/lib/env';
import { formatCode, formatDateTime, formatRemaining, initials, isCompleteCode, isEmail, normalizeInstagram } from '@/lib/format';
import { colors, fonts } from '@/lib/theme';
import { useResource } from '@/lib/useResource';
import { useSession } from '@/state/session';
import { Top10, beatSubtitle } from './Beats';
import { phaseAtLeast, RoleChip } from './shared';

const regionOptions = (regions: Regions | null) => (regions?.items.length ? regions.items.map((r) => r.name) : REGIONS).map((r) => ({ value: r, label: r }));

/* ───────── 06 · Chiamarsi Artisti: posti per regione e pacchetti ───────── */

function usePackages(regions: Regions | null): Package[] {
  const { t } = useTranslation();
  return useMemo(() => {
    if (regions?.packages.length) return regions.packages;
    return [
      { id: 'base', name: t('artists.packages.base.name'), price: t('artists.packages.base.price'), includes: [t('artists.packages.base.includes')] },
      { id: 'completo', name: t('artists.packages.completo.name'), price: t('artists.packages.completo.price'), includes: [t('artists.packages.completo.includes')] },
    ];
  }, [regions, t]);
}

export function ArtistiSection({ tick = 0 }: { tick?: number }) {
  const { t } = useTranslation();
  const { me, app, refreshAll } = useSession();
  const regions = useResource<Regions>('regions', api.regions);
  const refreshRegions = regions.refresh;
  useEffect(() => {
    if (tick) void refreshRegions();
  }, [tick, refreshRegions]);

  const m = me.data;
  const a = app.data;
  const packages = usePackages(regions.data);
  const [region, setRegion] = useState<string | null>(m?.region ?? null);
  const [pkg, setPkg] = useState<string | null>(null);
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!m || !a) return null;

  const isArtist = m.role === 'artista';
  // I prezzi compaiono solo quando l'Admin apre le iscrizioni: prima c'è solo la prenotazione dello slot.
  const enrollmentOpen = phaseAtLeast(a.phase, 'iscrizioni');
  const canPay = isArtist && a.can.checkout;
  const selectedRegion = regions.data?.items.find((r) => r.name === region) ?? null;

  const pay = async () => {
    if (!region || !pkg) return;
    setBusy(true);
    setError(null);
    try {
      const url = await api.checkout(pkg, region, rules);
      if (!url) throw new Error(t('artists.noCheckoutUrl'));
      // Stripe Checkout del sito nel browser: mai acquisti in-app. Il ritorno è /app/pagato.
      await WebBrowser.openBrowserAsync(url);
      await refreshAll();
      // se il link universale /app/pagato ha già aperto la schermata, non la si apre due volte
      if (!paidVisible.current) router.push('/pagato');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const startPay = () => {
    if (selectedRegion?.full) {
      // regione piena: lo si dice PRIMA di aprire il checkout, con la frase che arriva dalle API
      Alert.alert(t('artists.fullTitle', { region: selectedRegion.name }), selectedRegion.waitlistText ?? regions.data?.waitlistText ?? t('artists.fullFallback'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('artists.fullContinue'), onPress: () => void pay() },
      ]);
    } else void pay();
  };

  return (
    <View style={{ gap: 16 }} testID="artisti-section">
      <Pill label={t('artists.pill')} tone="muted" />
      <T v="h1">{t('artists.title')}</T>
      <T v="body">{enrollmentOpen ? t('artists.introOpen') : t('artists.introBefore')}</T>

      {!enrollmentOpen && isArtist ? (
        <Btn testID="artisti-slot" label={t('home.slot.title')} icon="arrow" onPress={() => router.push('/slot')} disabled={!a.can.bookSlot} />
      ) : null}
      {!enrollmentOpen && isArtist && !a.can.bookSlot ? <Notice text={t('slot.cannot')} /> : null}

      {enrollmentOpen ? (
        <View style={{ gap: 10 }} accessibilityRole={canPay ? 'radiogroup' : undefined}>
          {packages.map((p) => {
            const on = pkg === p.id;
            const content = (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <T v="title">{p.name}</T>
                  {p.price ? <T v="h2" color={colors.accent}>{p.price}</T> : null}
                </View>
                {p.includes.map((line) => <T key={line} v="small" color={colors.textSoft} style={{ fontSize: 13 }}>{line}</T>)}
              </>
            );
            return canPay ? (
              <Pressable
                key={p.id}
                testID={`package-${p.id}`}
                accessibilityRole="radio"
                accessibilityLabel={`${p.name}${p.price ? `, ${p.price}` : ''}. ${p.includes.join('. ')}`}
                accessibilityState={{ selected: on, checked: on }}
                onPress={() => setPkg(p.id)}
                style={{ padding: 16, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentSoft : colors.card }}
              >
                {content}
              </Pressable>
            ) : (
              <Card key={p.id}>{content}</Card>
            );
          })}
        </View>
      ) : null}

      {canPay ? (
        <Card>
          <T v="title">{t('artists.book')}</T>
          <Select label={t('fields.region')} value={region} onChange={setRegion} options={regionOptions(regions.data)} placeholder={t('fields.choose')} />
          {selectedRegion?.full ? <Notice kind="error" title={t('artists.fullTitle', { region: selectedRegion.name })} text={selectedRegion.waitlistText ?? regions.data?.waitlistText ?? t('artists.fullFallback')} testID="region-full" /> : null}
          <Check testID="artisti-rules" label={t('artists.acceptRules')} checked={rules} onChange={setRules} />
          <LinkText label={t('register.rules')} onPress={() => WebBrowser.openBrowserAsync(a.links.rules ?? `${env.siteUrl}/chiamarsi/regolamento`).catch(() => {})} />
          <Notice kind="error" text={error} />
          <Btn testID="artisti-pay" label={t('artists.pay')} icon="external" onPress={startPay} disabled={!region || !pkg || !rules} loading={busy} />
          <T v="small">{t('artists.payNote')}</T>
        </Card>
      ) : null}

      {enrollmentOpen && isArtist ? (
        <Card>
          <T v="title">{t('artists.alreadyPaid')}</T>
          <T v="small" color={colors.textSoft}>{t('artists.alreadyPaidText')}</T>
          <Btn testID="artisti-code" small variant="secondary" label={t('artists.enterCode')} onPress={() => router.push('/codice')} />
        </Card>
      ) : null}
      {!isArtist ? <Notice text={t('artists.onlyArtists')} /> : null}

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <T v="h2">{t('artists.seats')}</T>
          {regions.data?.totalEnrolled != null && regions.data.totalCapacity != null ? (
            <T v="small">{t('artists.seatsTotal', { enrolled: regions.data.totalEnrolled, capacity: regions.data.totalCapacity })}</T>
          ) : null}
        </View>
        <Notice kind="error" text={regions.data ? null : regions.error} />
        {(regions.data?.items ?? []).map((r) => (
          <View key={r.name} accessible accessibilityLabel={`${r.name}: ${r.enrolled ?? '–'} / ${r.capacity ?? '–'}${r.full ? `. ${t('artists.waitlist')}` : ''}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSoft }}>
            <T v="body" color={colors.text} style={{ flex: 1 }}>{r.name}</T>
            <T v="small" color={r.full ? colors.red : colors.muted} style={{ textAlign: 'right', flexShrink: 1 }}>
              {r.enrolled != null && r.capacity != null ? `${r.enrolled} / ${r.capacity}` : r.free != null ? t('artists.free', { count: r.free }) : ''}
              {r.full ? ` · ${t('artists.waitlist')}` : ''}
            </T>
          </View>
        ))}
        <Stale updatedAt={regions.updatedAt} stale={regions.stale} />
      </View>
      <Btn variant="secondary" small label={t('artists.finalLink')} icon="chevron" onPress={() => router.push('/finale')} />
    </View>
  );
}

/** Voce «Artisti» del menu. */
export function ArtistiTab() {
  const { t } = useTranslation();
  const { me, refreshAll } = useSession();
  const [tick, setTick] = useState(0);
  const m = me.data;
  if (!m) return null;
  return (
    <Screen
      testID="screen-artisti"
      edges={['top']}
      onRefresh={async () => {
        await refreshAll();
        setTick((x) => x + 1);
      }}
    >
      <LogoHeader badge={t('artists.badge')} right={<RoleChip me={m} />} />
      {m.role === 'artista' && m.hasEntry ? <MyPage tick={tick} /> : <ArtistiSection tick={tick} />}
    </Screen>
  );
}

/* ───────── 01c · Prenota il tuo slot: solo i dati, senza prezzi ───────── */

export function SlotScreen() {
  const { t } = useTranslation();
  const { me, app, session } = useSession();
  const m = me.data;
  const existing = useResource<Interest | null>(`interest.${m?.id ?? 'me'}`, api.interest);
  const email = m?.email ?? session?.user.email ?? '';
  const [form, setForm] = useState<Interest>({
    stageName: m?.name ?? '', region: m?.region ?? '', city: m?.city ?? '', phone: m?.phone ?? '', instagram: m?.instagram ?? '', email, genre: '', wantsToJoin: false, updatesConsent: false,
  });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (existing.data && !loaded) {
      setForm({ ...existing.data, email: existing.data.email || email });
      setLoaded(true);
    }
  }, [existing.data, loaded, email]);

  const set = <K extends keyof Interest>(k: K, v: Interest[K]) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.stageName.trim().length >= 2 && !!form.region && form.city.trim().length >= 2 && form.phone.trim().length >= 6 && !!form.genre && form.wantsToJoin;
  const canBook = !!app.data?.can.bookSlot;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await api.saveInterest({ ...form, instagram: normalizeInstagram(form.instagram), email });
      existing.setData(() => saved ?? { ...form, email });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      testID="screen-slot"
      footer={
        done ? <Btn label={t('common.backHome')} onPress={() => router.replace('/')} testID="slot-done" /> : <Btn testID="slot-submit" label={existing.data ? t('slot.update') : t('slot.submit')} onPress={submit} disabled={!valid || !canBook} loading={busy} />
      }
    >
      <BackHeader eyebrow={t('slot.eyebrow')} title={t('slot.title')} />
      <T v="body">{t('slot.intro')}</T>
      {done ? <Notice kind="ok" title={t('home.slot.bookedTitle')} text={t('slot.doneText')} testID="slot-ok" /> : null}
      {!canBook ? <Notice text={t('slot.cannot')} /> : null}
      <Field label={t('fields.stageName')} value={form.stageName} onChangeText={(v) => set('stageName', v)} testID="slot-name" />
      <Select label={t('fields.region')} value={form.region || null} onChange={(v) => set('region', v)} options={regionOptions(null)} placeholder={t('fields.choose')} />
      <Field label={t('fields.city')} value={form.city} onChangeText={(v) => set('city', v)} testID="slot-city" />
      <Field label={t('fields.phone')} value={form.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" autoComplete="tel" testID="slot-phone" />
      <Field label={t('fields.instagram')} value={form.instagram} onChangeText={(v) => set('instagram', v)} autoCapitalize="none" autoCorrect={false} placeholder="@" />
      <Field label={t('slot.email')} value={email} editable={false} style={{ color: colors.muted }} />
      <Chips label={t('fields.genre')} options={GENRES.map((g) => ({ value: g, label: g }))} value={form.genre || null} onChange={(v) => set('genre', v)} />
      <Check testID="slot-want" label={t('slot.want')} checked={form.wantsToJoin} onChange={(v) => set('wantsToJoin', v)} />
      <Check testID="slot-updates" label={t('slot.updates')} checked={form.updatesConsent} onChange={(v) => set('updatesConsent', v)} />
      <Notice kind="error" text={error} />
      <T v="small">{t('slot.note')}</T>
    </Screen>
  );
}

/* ───────── Ritorno dal pagamento (/app/pagato) ───────── */

export const paidVisible = { current: false };

export function PaidScreen() {
  const { t } = useTranslation();
  const { me, refreshAll } = useSession();
  const [tries, setTries] = useState(0);
  const active = !!me.data?.activeCode || !!me.data?.hasEntry;

  useEffect(() => {
    paidVisible.current = true;
    try {
      void WebBrowser.dismissBrowser();
    } catch {}
    return () => {
      paidVisible.current = false;
    };
  }, []);

  // il codice lo genera il webhook del sito: può volerci qualche secondo
  useEffect(() => {
    if (active || tries >= 6) return;
    const id = setTimeout(async () => {
      await refreshAll();
      setTries((n) => n + 1);
    }, tries === 0 ? 0 : 2500);
    return () => clearTimeout(id);
  }, [active, tries, refreshAll]);

  useEffect(() => {
    if (active) router.replace(me.data?.hasEntry ? '/artisti' : '/codice');
  }, [active, me.data?.hasEntry]);

  const waiting = !active && tries < 6;
  return (
    <Screen testID="screen-paid" scroll={false} contentStyle={{ flex: 1, justifyContent: 'center' }}>
      <T v="h1">{waiting ? t('paid.checking') : t('paid.notYet')}</T>
      <T v="body">{waiting ? t('paid.checkingText') : t('paid.notYetText')}</T>
      {!waiting ? (
        <>
          <Btn label={t('common.retry')} onPress={() => setTries(0)} />
          <Btn variant="secondary" label={t('artists.enterCode')} onPress={() => router.replace('/codice')} />
          <Btn variant="ghost" label={t('common.backHome')} onPress={() => router.replace('/')} />
        </>
      ) : null}
    </Screen>
  );
}

/* ───────── 07 · Codice di iscrizione, dati e studio ───────── */

const EXTERNAL = '__esterno__';

export function CodeScreen() {
  const { t, i18n } = useTranslation();
  const { me, session, refreshAll } = useSession();
  const m = me.data;
  const [code, setCode] = useState(formatCode(m?.activeCode ?? ''));
  const [region, setRegion] = useState<string | null>(m?.region ?? null);
  const [city, setCity] = useState(m?.city ?? '');
  const [phone, setPhone] = useState(m?.phone ?? '');
  const [email, setEmail] = useState(m?.email ?? session?.user.email ?? '');
  const [instagram, setInstagram] = useState(m?.instagram ?? '');
  const [since, setSince] = useState(m?.artistSince ?? '');
  const [studio, setStudio] = useState<string | null>(null);
  const [ext, setExt] = useState({ name: '', address: '', instagram: '', phone: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const studios = useResource<Studio[]>(region ? `studios.${region}` : null, () => api.studios(region));

  useEffect(() => {
    if (m?.activeCode && !code) setCode(formatCode(m.activeCode));
  }, [m?.activeCode, code]);

  const extValid = ext.name.trim().length >= 2 && ext.phone.trim().length >= 6 && (!ext.email || isEmail(ext.email));
  const valid =
    isCompleteCode(code) && !!region && city.trim().length >= 2 && phone.trim().length >= 6 && isEmail(email) && /^\d{4}$/.test(since) && !!studio && (studio !== EXTERNAL || extValid);

  const submit = async () => {
    if (!region || !studio) return;
    setBusy(true);
    setError(null);
    setRemaining(null);
    try {
      await api.redeem({
        codice: formatCode(code),
        regione: region,
        citta: city.trim(),
        telefono: phone.trim(),
        email: email.trim().toLowerCase(),
        instagram: normalizeInstagram(instagram),
        da_quando_artista: since,
        studio_partner_id: studio === EXTERNAL ? null : studio,
        studio_esterno: studio === EXTERNAL ? { ...ext, instagram: normalizeInstagram(ext.instagram) } : null,
      });
      await refreshAll();
      me.setData((prev) => (prev ? { ...prev, hasEntry: true } : prev));
      router.replace('/artisti');
    } catch (e) {
      // codice sbagliato, già usato, blocco di un'ora: le parole sono quelle del server
      setError(errorMessage(e));
      if (e instanceof ApiError && e.retryAfter) setRemaining(e.retryAfter);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen testID="screen-code" footer={<Btn testID="code-submit" label={t('code.submit')} onPress={submit} disabled={!valid} loading={busy} />}>
      <BackHeader eyebrow={t('artists.badge')} title={t('code.title')} />
      <Field
        testID="code-input"
        label={t('code.label')}
        value={code}
        onChangeText={(v) => setCode(formatCode(v))}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={22}
        placeholder="LM27-XXXX-XXXX-XXXX-XX"
        style={{ fontFamily: fonts.title, fontSize: 17, letterSpacing: 1 }}
        hint={t('code.hint')}
      />
      {m?.activeCode ? <Notice kind="ok" text={t('code.prefilled')} /> : null}
      <Notice kind="error" text={error} title={remaining ? t('code.blocked', { time: formatRemaining(remaining, i18n.language) }) : undefined} testID="code-error" />
      <Select label={t('fields.region')} value={region} onChange={(v) => { setRegion(v); setStudio(null); }} options={regionOptions(null)} placeholder={t('fields.choose')} />
      <Field label={t('fields.city')} value={city} onChangeText={setCity} testID="code-city" />
      <Field label={t('fields.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" testID="code-phone" />
      <Field label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <Field label={t('fields.instagram')} value={instagram} onChangeText={setInstagram} autoCapitalize="none" autoCorrect={false} placeholder="@" />
      <Field label={t('code.since')} value={since} onChangeText={(v) => setSince(v.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="2022" testID="code-since" />

      <T v="h2">{t('code.studioTitle')}</T>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
        {(studios.data ?? []).map((s) => (
          <StudioOption key={s.id} on={studio === s.id} title={[s.name, s.city].filter(Boolean).join(' · ')} sub={t('code.partner')} badge={initials(s.name)} onPress={() => setStudio(s.id)} testID={`studio-${s.id}`} />
        ))}
        {region && studios.data && !studios.data.length ? <T v="small">{t('code.noPartners')}</T> : null}
        {!region ? <T v="small">{t('code.chooseRegionFirst')}</T> : null}
        <Notice kind="error" text={studios.data ? null : studios.error} />
        <StudioOption on={studio === EXTERNAL} title={t('code.external')} sub={t('code.externalSub')} badge="+" onPress={() => setStudio(EXTERNAL)} testID="studio-external" />
      </View>
      {studio === EXTERNAL ? (
        <Card>
          <Field label={t('code.ext.name')} value={ext.name} onChangeText={(v) => setExt({ ...ext, name: v })} testID="ext-name" />
          <Field label={t('fields.instagram')} value={ext.instagram} onChangeText={(v) => setExt({ ...ext, instagram: v })} autoCapitalize="none" autoCorrect={false} placeholder="@" />
          <Field label={t('code.ext.address')} value={ext.address} onChangeText={(v) => setExt({ ...ext, address: v })} />
          <Field label={t('code.ext.phone')} value={ext.phone} onChangeText={(v) => setExt({ ...ext, phone: v })} keyboardType="phone-pad" testID="ext-phone" />
          <Field label={t('code.ext.email')} value={ext.email} onChangeText={(v) => setExt({ ...ext, email: v })} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        </Card>
      ) : null}
      <T v="small">{t('code.contactNote')}</T>
    </Screen>
  );
}

function StudioOption({ on, title, sub, badge, onPress, testID }: { on: boolean; title: string; sub: string; badge: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${sub}`}
      accessibilityState={{ selected: on, checked: on }}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentSoft : 'transparent', minHeight: 56 }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: on ? colors.accent : colors.card, alignItems: 'center', justifyContent: 'center' }}>
        <T v="title" style={{ fontSize: 14, color: on ? colors.onAccent : colors.text }}>{badge}</T>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="body" style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{title}</T>
        <T v="small">{sub}</T>
      </View>
      {on ? <Icon name="check" color={colors.accent} strokeWidth={2.5} /> : null}
    </Pressable>
  );
}

/* ───────── 08 · La mia pagina (artista iscritto) ───────── */

const STEP_OF: Record<string, number> = {
  iscritto: 0, lista_attesa: 0, da_contattare: 0,
  session_prenotata: 1, session_fatta: 1,
  consegna_studio: 2, brano_caricato: 2, controllato: 2,
  online: 3, in_gara: 3, passato: 3, wildcard: 3,
};
const KNOWN_STATUS = [...Object.keys(STEP_OF), 'escluso', 'annullato'];

export function MyPage({ tick = 0 }: { tick?: number }) {
  const { t, i18n } = useTranslation();
  const { me, app, session } = useSession();
  const entry = useResource<Entry | null>(`entry.${session?.user.id ?? 'anon'}`, api.entry);
  const refreshEntry = entry.refresh;
  useEffect(() => {
    if (tick) void refreshEntry();
  }, [tick, refreshEntry]);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const m = me.data;
  const e = entry.data;

  if (!e) {
    return (
      <View style={{ gap: 12 }}>
        <T v="h2">{t('entry.title')}</T>
        {entry.loading ? <T v="small">{t('common.loading')}</T> : <Notice kind="error" text={entry.error ?? t('entry.missing')} />}
      </View>
    );
  }

  const statusLabel = e.statusText ?? (KNOWN_STATUS.includes(e.status) ? t(`entry.status.${e.status}`) : e.status);
  const bad = e.status === 'escluso' || e.status === 'annullato';
  const canUpload = e.canUploadTrack || !!app.data?.can.uploadTrack;
  const canChoose = e.canChooseBeat;

  const choose = async (beatId: string) => {
    setError(null);
    try {
      const updated = await api.chooseBeat(beatId);
      if (updated) entry.setData(() => updated);
      setPicking(false);
      void entry.refresh();
    } catch (err) {
      setPicking(false);
      setError(errorMessage(err));
    }
  };

  return (
    <View style={{ gap: 14 }} testID="my-page">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <T v="title" style={{ color: colors.onAccent, fontSize: 20 }}>{initials(m?.name)}</T>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="h2">{m?.name ?? ''}</T>
          <T v="small">{[t('roles.artista'), e.region, e.city, e.instagram].filter(Boolean).join(' · ')}</T>
        </View>
      </View>
      <Pill label={statusLabel} tone={bad ? 'red' : 'green'} dot />
      {!bad ? <Steps steps={[t('entry.steps.code'), t('entry.steps.session'), t('entry.steps.delivery'), t('entry.steps.online')]} current={STEP_OF[e.status] ?? 0} /> : null}
      <Notice kind="error" text={error} />

      <Card>
        <T v="eyebrow">{t('entry.session')}</T>
        {e.studio?.name ? <T v="title">{[e.studio.name, e.studio.city].filter(Boolean).join(', ')}</T> : <T v="body">{t('entry.studioPending')}</T>}
        <T v="small" color={colors.textSoft}>{e.sessionAt ? formatDateTime(e.sessionAt, i18n.language) : t('entry.sessionPending')}</T>
        {e.studio?.phone ? (
          <Btn small variant="secondary" icon="phone" label={t('entry.callStudio')} onPress={() => Linking.openURL(`tel:${e.studio?.phone?.replace(/\s+/g, '')}`).catch(() => {})} testID="call-studio" />
        ) : null}
      </Card>

      <Card>
        <T v="eyebrow">{t('entry.beat')}</T>
        {e.beat ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <PlayButton id={`entry-${e.beat.id}`} url={e.beat.previewUrl} title={e.beat.title} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="title">{e.beat.title}</T>
              <T v="small">{beatSubtitle(e.beat)}</T>
            </View>
          </View>
        ) : (
          <T v="body">{t('entry.noBeat')}</T>
        )}
        {canChoose ? <Btn small variant="secondary" label={e.beat ? t('entry.changeBeat') : t('entry.chooseBeat')} onPress={() => setPicking(true)} testID="choose-beat" /> : null}
      </Card>

      <Card>
        <T v="eyebrow">{t('entry.package')}</T>
        <T v="title">{e.packageName ?? (e.packageId ? t(`artists.packages.${e.packageId === 'completo' ? 'completo' : 'base'}.name`) : '—')}</T>
        {e.trackDueAt ? <T v="small" color={colors.textSoft}>{t('entry.dueBy', { date: formatDateTime(e.trackDueAt, i18n.language) })}</T> : null}
        {e.studioDeliveredAt ? <Notice kind="ok" text={t('entry.studioDelivered', { date: formatDateTime(e.studioDeliveredAt, i18n.language) })} /> : null}
      </Card>

      <Btn testID="go-track" label={t('entry.uploadTrack')} icon="arrow" onPress={() => router.push('/brano')} disabled={!canUpload && (STEP_OF[e.status] ?? 0) < 2} />
      {e.spotifyUrl ? <LinkText label={t('common.spotifyLink')} color={colors.text} onPress={() => Linking.openURL(e.spotifyUrl as string).catch(() => {})} /> : null}
      <Stale updatedAt={entry.updatedAt} stale={entry.stale} />

      <Modal visible={picking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicking(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <Screen edges={[]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <T v="h2" style={{ flex: 1 }}>{t('entry.chooseBeat')}</T>
              <IconBtn name="close" label={t('common.close')} onPress={() => setPicking(false)} />
            </View>
            <T v="body">{t('entry.chooseBeatText')}</T>
            <Top10 onPick={(b) => void choose(b.id)} pickedId={e.beat?.id ?? null} />
          </Screen>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
