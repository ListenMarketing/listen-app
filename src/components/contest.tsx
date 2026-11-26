import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius } from '@/lib/theme';
import { countdownParts, formatDateTime, formatSeconds, pad2 } from '@/lib/format';
import { usePlayer } from '@/lib/player';
import { api } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { Btn, Card, Chips, Field, IconBtn, Notice, T } from './ui';
import { Icon } from './Icon';

/* ───────── Countdown alla prossima fase ───────── */

export function Countdown({ target, label }: { target: string | null; label: string }) {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const parts = countdownParts(target, now);
  if (!parts) return null;
  const cells: [number, string][] = [
    [parts.days, t('countdown.days')],
    [parts.hours, t('countdown.hours')],
    [parts.minutes, t('countdown.minutes')],
    [parts.seconds, t('countdown.seconds')],
  ];
  const spoken = t('countdown.spoken', { label, days: parts.days, hours: parts.hours, minutes: parts.minutes });
  return (
    <View style={{ gap: 10 }} testID="countdown">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <T v="eyebrow" style={{ flex: 1 }}>{label}</T>
        <T v="small">{formatDateTime(target, i18n.language)}</T>
      </View>
      {/* un solo elemento per VoiceOver/TalkBack: non legge i secondi a ogni scatto */}
      <View accessible accessibilityRole="timer" accessibilityLabel={spoken} style={{ flexDirection: 'row', gap: 8 }}>
        {cells.map(([n, l]) => (
          <View key={l} style={st.cell}>
            <T v="h2" style={{ fontSize: 26, lineHeight: 30, color: colors.accent }}>{pad2(n)}</T>
            <T v="small" style={{ fontSize: 11 }}>{l}</T>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ───────── Cuori ───────── */

/** «Hai N cuori»: il numero arriva dal server, l'app non lo calcola. */
export function HeartCounter({ available, total, caption }: { available: number | null; total?: number | null; caption?: string }) {
  const { t } = useTranslation();
  if (available == null) return null;
  const label = t('hearts.youHave', { count: available });
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={st.heartBadge}>
        <Icon name="heart" color={colors.onAccent} filled size={22} />
      </View>
      <View style={{ flex: 1, gap: 2 }} accessible accessibilityLiveRegion="polite" accessibilityLabel={total != null ? `${label}. ${t('hearts.ofTotal', { total })}` : label}>
        <T v="title" testID="heart-counter">{label}</T>
        {total != null ? <T v="small">{t('hearts.ofTotal', { total })}</T> : null}
        {caption ? <T v="small">{caption}</T> : null}
      </View>
    </Card>
  );
}

export function HeartButton({ title, hearted, disabled, onPress, testID }: { title: string; hearted: boolean; disabled?: boolean; onPress: () => void; testID?: string }) {
  const { t } = useTranslation();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={hearted ? t('hearts.remove', { title }) : t('hearts.give', { title })}
      accessibilityState={{ selected: hearted, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [st.round, hearted && { backgroundColor: colors.accent, borderColor: colors.accent }, pressed && { opacity: 0.7 }, disabled && { opacity: 0.45 }]}
    >
      <Icon name="heart" size={20} color={hearted ? colors.onAccent : colors.text} filled={hearted} />
    </Pressable>
  );
}

export function PlayButton({ id, url, title }: { id: string; url: string | null; title: string }) {
  const { t } = useTranslation();
  const { playingId, toggle } = usePlayer();
  const playing = playingId === id;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? t('player.pause', { title }) : t('player.play', { title })}
      accessibilityHint={t('player.hint')}
      accessibilityState={{ disabled: !url, selected: playing }}
      disabled={!url}
      onPress={() => toggle(id, url)}
      hitSlop={6}
      style={({ pressed }) => [st.round, { backgroundColor: playing ? colors.accent : colors.bg }, pressed && { opacity: 0.7 }, !url && { opacity: 0.45 }]}
    >
      <Icon name={playing ? 'pause' : 'play'} size={18} color={playing ? colors.onAccent : colors.text} />
    </Pressable>
  );
}

/** Riga di un beat o di un brano: anteprima, dati pubblici, cuore, segnala. Nessun dato personale. */
export function MediaRow(p: {
  id: string;
  title: string;
  subtitle: string;
  previewUrl: string | null;
  hearts?: number | null;
  hearted?: boolean;
  onHeart?: () => void;
  heartDisabled?: boolean;
  onReport?: () => void;
  spotifyUrl?: string | null;
  onOpenSpotify?: () => void;
  mine?: boolean;
  index?: number;
}) {
  const { t } = useTranslation();
  const { playingId, position } = usePlayer();
  const playing = playingId === p.id;
  return (
    <View style={st.row} testID={`row-${p.id}`}>
      <PlayButton id={p.id} url={p.previewUrl} title={p.title} />
      <View style={{ flex: 1, gap: 2 }}>
        <T v="title" style={{ fontSize: 15 }} numberOfLines={2}>{p.title}{p.mine ? ` · ${t('common.yours')}` : ''}</T>
        <T v="small" numberOfLines={2}>{p.subtitle}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, alignItems: 'center' }}>
          {playing ? <T v="small" color={colors.accent}>{formatSeconds(position)}</T> : null}
          {p.hearts != null ? <T v="small">{t('hearts.count', { count: p.hearts })}</T> : null}
          {p.spotifyUrl && p.onOpenSpotify ? (
            <Pressable accessibilityRole="link" accessibilityLabel={t('common.spotifyLinkOf', { title: p.title })} onPress={p.onOpenSpotify} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
              <T v="small" style={{ color: colors.text, textDecorationLine: 'underline' }}>{t('common.spotifyLink')}</T>
            </Pressable>
          ) : null}
        </View>
      </View>
      {p.onReport && !p.mine ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('report.buttonFor', { title: p.title })} onPress={p.onReport} hitSlop={8} style={st.flag}>
          <Icon name="flag" size={16} color={colors.muted} />
        </Pressable>
      ) : null}
      {p.onHeart ? <HeartButton title={p.title} hearted={!!p.hearted} disabled={p.heartDisabled} onPress={p.onHeart} testID={`heart-${p.index ?? p.id}`} /> : null}
    </View>
  );
}

/* ───────── Segnala e nascondi (requisito degli store per i contenuti degli utenti) ───────── */

const REASONS = ['offensivo', 'copiato', 'spam', 'altro'] as const;

export function ReportModal({ target, onClose, onHidden }: { target: { type: 'beat' | 'brano'; id: string; title: string } | null; onClose: () => void; onHidden: (id: string) => void }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (target) {
      setReason(null);
      setNote('');
      setError(null);
      setDone(false);
    }
  }, [target]);

  if (!target) return null;
  const send = async () => {
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      await api.report(target.type, target.id, reason, note.trim());
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const hide = () => {
    onHidden(target.id);
    onClose();
  };
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ padding: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <T v="h2" style={{ flex: 1 }}>{t('report.title')}</T>
            <IconBtn name="close" label={t('common.close')} onPress={onClose} />
          </View>
          <T v="body">{t('report.intro', { title: target.title })}</T>
          {done ? (
            <>
              <Notice kind="ok" title={t('report.sent')} text={t('report.sentText')} />
              <Btn label={t('report.hide')} variant="secondary" onPress={hide} testID="report-hide" />
              <Btn label={t('common.close')} variant="ghost" onPress={onClose} />
            </>
          ) : (
            <>
              <Chips label={t('report.reason')} value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: t(`report.reasons.${r}`) }))} />
              <Field label={t('report.note')} value={note} onChangeText={setNote} multiline maxLength={500} />
              <Notice kind="error" text={error} />
              <Btn label={t('report.send')} onPress={send} disabled={!reason} loading={busy} testID="report-send" />
              <Btn label={t('report.hideOnly')} variant="secondary" onPress={hide} />
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* ───────── Playlist: il bottone resta grigio finché il server non dice che il link è stato aperto ───────── */

export function PlaylistConfirmButton({ openedAt, loading, onPress }: { openedAt: string | null; loading?: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const enabled = !!openedAt;
  return (
    <View style={{ gap: 8 }}>
      {!enabled ? <T v="small" style={{ textAlign: 'center' }}>{t('playlist.greyHint')}</T> : null}
      <Btn testID="playlist-confirm" label={t('playlist.confirm')} icon="arrow" disabled={!enabled} loading={loading} onPress={onPress} hint={!enabled ? t('playlist.greyHint') : undefined} />
    </View>
  );
}

/* ───────── Passi dell'iscrizione ───────── */

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={t('entry.stepsSpoken', { step: steps[Math.min(current, steps.length - 1)], n: Math.min(current + 1, steps.length), total: steps.length })}>
      {steps.map((label, i) => (
        <View key={label} style={{ flex: 1, gap: 5 }}>
          <View style={{ height: 4, borderRadius: 4, backgroundColor: i <= current ? colors.accent : 'rgba(255,255,255,0.14)' }} />
          <T v="small" style={{ fontSize: 11, fontFamily: i <= current ? fonts.bodyBold : fonts.bodySemi, color: i <= current ? colors.text : colors.muted }}>{label}</T>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: colors.bg },
  heartBadge: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft },
  flag: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
