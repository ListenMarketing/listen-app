import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { Role } from '@/api/types';
import { PlaylistConfirmButton } from '@/components/contest';
import { Icon, type IconName } from '@/components/Icon';
import { Btn, Card, LinkText, LogoHeader, Notice, Screen, Stale, T } from '@/components/ui';
import { env } from '@/lib/env';
import { formatTime } from '@/lib/format';
import { colors } from '@/lib/theme';
import { useSession } from '@/state/session';

const ROLES: { role: Role; icon: IconName }[] = [
  { role: 'producer', icon: 'mixer' },
  { role: 'artista', icon: 'mic' },
  { role: 'pubblico', icon: 'heart' },
  { role: 'studio', icon: 'studio' },
];

/** 00a · Chi sei: si sceglie una volta sola, poi il ruolo lo cambia solo Listen. */
export function RoleScreen() {
  const { t } = useTranslation();
  const { me, signOut } = useSession();
  const [role, setRole] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!role) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await api.setRole(role);
      me.setData((prev) => ({ ...(prev ?? saved), ...saved, role: saved.role ?? role }));
      void me.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (!role) return;
    Alert.alert(t('role.confirmTitle', { role: t(`roles.${role}`) }), t('role.confirmText'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), onPress: () => void save() },
    ]);
  };

  return (
    <Screen
      testID="screen-role"
      footer={<Btn testID="role-continue" label={role ? t('role.continueAs', { role: t(`roles.${role}`).toLowerCase() }) : t('role.choose')} icon="arrow" disabled={!role} loading={busy} onPress={confirm} />}
    >
      <LogoHeader />
      <View style={{ gap: 10, marginTop: 4 }}>
        <T v="eyebrow">{t('onboarding.step', { n: 2 })}</T>
        <T v="h1">{t('role.title')}</T>
        <T v="body">{t('role.intro')}</T>
      </View>
      <View style={{ gap: 10 }} accessibilityRole="radiogroup">
        {ROLES.map(({ role: r, icon }) => {
          const on = role === r;
          return (
            <Pressable
              key={r}
              testID={`role-${r}`}
              accessibilityRole="radio"
              accessibilityLabel={`${t(`roles.${r}`)}. ${t(`role.desc.${r}`)}`}
              accessibilityState={{ selected: on, checked: on }}
              onPress={() => setRole(r)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentSoft : 'transparent' }}
            >
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: on ? colors.accent : colors.card, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={22} color={on ? colors.onAccent : colors.text} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <T v="title">{t(`roles.${r}`)}</T>
                <T v="small" color={on ? colors.textSoft : colors.muted}>{t(`role.desc.${r}`)}</T>
              </View>
              {on ? <Icon name="check" color={colors.accent} strokeWidth={2.5} /> : null}
            </Pressable>
          );
        })}
      </View>
      <T v="small" style={{ textAlign: 'center' }}>{t('role.changeNote')}</T>
      <Notice kind="error" text={error} />
      <LinkText label={t('me.signOut')} color={colors.muted} onPress={() => void signOut()} />
    </Screen>
  );
}

/**
 * 00b · Segui la playlist (obbligatorio). L'app non chiede l'account Spotify e non
 * legge niente da Spotify: registra solo il tocco sul link, e lo dice a schermo.
 */
export function PlaylistScreen() {
  const { t, i18n } = useTranslation();
  const { me, app, signOut } = useSession();
  const [busy, setBusy] = useState<'open' | 'confirm' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playlist = app.data?.playlist;
  const openedAt = me.data?.playlistOpenedAt ?? null;

  const open = async () => {
    if (!playlist?.url) return;
    setBusy('open');
    setError(null);
    try {
      // browser di sistema o app Spotify: decide il telefono
      await Linking.openURL(playlist.url);
      await api.playlistOpened();
      await me.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    setBusy('confirm');
    setError(null);
    try {
      await api.playlistConfirm();
      await me.refresh();
    } catch (e) {
      setError(errorMessage(e));
      void me.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen
      testID="screen-playlist"
      onRefresh={() => Promise.all([me.refresh(), app.refresh()])}
      footer={<PlaylistConfirmButton openedAt={openedAt} loading={busy === 'confirm'} onPress={confirm} />}
    >
      <View style={{ gap: 4 }}>
        <T v="eyebrow">{t('onboarding.step', { n: 3 })}</T>
        <T v="title" style={{ fontSize: 18 }}>{t('playlist.lastStep')}</T>
      </View>
      <View style={{ gap: 10 }}>
        <T v="h1">{t('playlist.title')}</T>
        <T v="body">{t('playlist.intro')}</T>
      </View>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="note" size={34} color={colors.onAccent} strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <T v="eyebrow">{t('playlist.official')}</T>
            <T v="title">{playlist?.name ?? t('playlist.fallbackName')}</T>
            {playlist?.subtitle ? <T v="small">{playlist.subtitle}</T> : null}
          </View>
        </View>
        <Btn testID="playlist-open" small label={t('playlist.open')} icon="external" onPress={open} loading={busy === 'open'} disabled={!playlist?.url} />
        {!playlist?.url ? <Notice text={t('playlist.missing')} /> : null}
        {openedAt ? (
          <Notice testID="playlist-opened" kind="ok" title={t('playlist.openedAt', { time: formatTime(openedAt, i18n.language) })} text={t('playlist.nowConfirm')} />
        ) : null}
      </Card>
      <View style={{ gap: 8 }}>
        <View style={row}>
          <View style={badge}><T v="title" style={{ fontSize: 14, color: colors.accent }}>2</T></View>
          <T v="small" style={{ flex: 1, fontSize: 13, color: colors.textSoft }}>{t('playlist.step2')}</T>
        </View>
        <View style={row}>
          <View style={badge}><Icon name="lock" size={16} color={colors.accent} /></View>
          <T v="small" style={{ flex: 1, fontSize: 13, color: colors.textSoft }}>{t('playlist.noSpotify')}</T>
        </View>
      </View>
      <Notice kind="error" text={error} />
      <Stale updatedAt={me.updatedAt} stale={me.stale} />
      <LinkText label={t('me.signOut')} color={colors.muted} onPress={() => void signOut()} />
    </Screen>
  );
}

const row = { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border } as const;
const badge = { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' } as const;

/** Versione minima più alta di quella installata: l'app non va avanti. */
export function UpdateScreen() {
  const { t } = useTranslation();
  const { app } = useSession();
  const url =
    Platform.OS === 'ios'
      ? (app.data?.storeUrl.ios ?? (env.iosAppStoreId ? `https://apps.apple.com/app/id${env.iosAppStoreId}` : null))
      : (app.data?.storeUrl.android ?? `https://play.google.com/store/apps/details?id=${env.androidPackage}`);
  return (
    <Screen testID="screen-update" scroll={false} contentStyle={{ justifyContent: 'center', flex: 1 }}>
      <LogoHeader />
      <T v="h1">{t('update.title')}</T>
      <T v="body">{t('update.text')}</T>
      <Btn label={t('update.button')} icon="external" disabled={!url} onPress={() => url && Linking.openURL(url).catch(() => {})} />
      <Btn label={t('common.retry')} variant="secondary" onPress={() => void app.refresh()} loading={app.loading} />
    </Screen>
  );
}

/** Primo avvio senza rete (o server che non risponde) e niente salvato in locale. */
export function LoadErrorScreen() {
  const { t } = useTranslation();
  const { me, app, refreshAll, signOut } = useSession();
  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center', flex: 1 }}>
      <LogoHeader />
      <T v="h1">{t('loadError.title')}</T>
      <Notice kind="error" text={me.error ?? app.error ?? t('common.needNetwork')} />
      <Btn label={t('common.retry')} onPress={() => void refreshAll()} loading={me.loading || app.loading} />
      <LinkText label={t('me.signOut')} color={colors.muted} onPress={() => void signOut()} />
    </Screen>
  );
}
