import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import type { Entry, TrackData, TrackStatus } from '@/api/types';
import { BackHeader, Btn, Card, Check, Chips, Field, LinkText, Notice, ProgressBar, Screen, Stale, T } from '@/components/ui';
import { GENRES } from '@/lib/constants';
import { formatBytes, formatDateTime } from '@/lib/format';
import { colors } from '@/lib/theme';
import { uploadToSignedUrl } from '@/lib/upload';
import { useResource } from '@/lib/useResource';
import { COVER_SIDE, mimeFor, validateCover, validateWav } from '@/lib/validation';
import { useSession } from '@/state/session';

type LocalFile = { uri: string; name: string; size: number | null; mime: string; width?: number; height?: number };
type Draft = { data: TrackData; wav: LocalFile | null; cover: LocalFile | null };

const emptyData = (artistName: string, producer: string): TrackData => ({
  title: '', artistName, spotifyProfileUrl: '', genre: '', language: 'Italiano', explicit: false, lyricsAuthor: '', producer, lyrics: '',
  declarations: { mine: false, notOffensive: false, distribution: false },
});

/** 08b · Carica il WAV e i dati per la distribuzione. La bozza resta in locale finché non è inviata. */
export function TrackScreen() {
  const { t, i18n } = useTranslation();
  const { me, session, app } = useSession();
  const uid = session?.user.id ?? 'anon';
  const draftKey = `listen.draft.track.${uid}`;
  const status = useResource<TrackStatus>(`track.${uid}`, api.track);
  const entry = useResource<Entry | null>(`entry.${uid}`, api.entry);

  const producerLabel = entry.data?.beat ? [entry.data.beat.producerName, entry.data.beat.title].filter(Boolean).join(' · ') : '';
  const [draft, setDraft] = useState<Draft>({ data: emptyData(me.data?.name ?? '', ''), wav: null, cover: null });
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<{ label: string; value: number } | null>(null);
  const [busy, setBusy] = useState<'wav' | 'cover' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // carica la bozza salvata sul telefono
  useEffect(() => {
    AsyncStorage.getItem(draftKey)
      .then((raw) => {
        if (raw) setDraft(JSON.parse(raw) as Draft);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [draftKey]);

  // il producer è precompilato dal beat scelto
  useEffect(() => {
    if (ready && producerLabel) setDraft((d) => (d.data.producer ? d : { ...d, data: { ...d.data, producer: producerLabel } }));
  }, [ready, producerLabel]);

  // salva la bozza a ogni modifica
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(draftKey, JSON.stringify(draft)).catch(() => {});
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, ready, draftKey]);

  const set = <K extends keyof TrackData>(k: K, v: TrackData[K]) => setDraft((d) => ({ ...d, data: { ...d.data, [k]: v } }));
  const setDecl = (k: keyof TrackData['declarations'], v: boolean) => setDraft((d) => ({ ...d, data: { ...d.data, declarations: { ...d.data.declarations, [k]: v } } }));

  const pickWav = async () => {
    setBusy('wav');
    setFileError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['audio/wav', 'audio/x-wav', 'audio/*'], copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      if (!validateWav({ name: a.name, mimeType: a.mimeType }).ok) {
        setFileError(t('track.errors.wav_format'));
        return;
      }
      setDraft((d) => ({ ...d, wav: { uri: a.uri, name: a.name, size: a.size ?? null, mime: 'audio/wav' } }));
    } catch (e) {
      setFileError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const pickCover = async () => {
    setBusy('cover');
    setFileError(null);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const name = a.fileName ?? `copertina.${(a.mimeType ?? '').includes('png') ? 'png' : 'jpg'}`;
      const check = validateCover({ width: a.width, height: a.height, mimeType: a.mimeType, name });
      if (!check.ok) {
        setFileError(t(`track.errors.${check.reason}`, { width: a.width, height: a.height, side: COVER_SIDE }));
        return;
      }
      setDraft((d) => ({ ...d, cover: { uri: a.uri, name, size: a.fileSize ?? null, mime: mimeFor(name, a.mimeType), width: a.width, height: a.height } }));
    } catch (e) {
      setFileError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const d = draft.data;
  const valid =
    !!draft.wav && d.title.trim() && d.artistName.trim() && d.genre && d.language.trim() && d.lyricsAuthor.trim() && d.lyrics.trim() &&
    d.declarations.mine && d.declarations.notOffensive && d.declarations.distribution;

  const send = async () => {
    if (!draft.wav) return;
    setBusy('send');
    setError(null);
    try {
      const wavTarget = await api.trackUploadUrl('wav', { file_name: draft.wav.name, content_type: draft.wav.mime, size: draft.wav.size });
      if (!wavTarget) throw new Error(t('producer.beat.noUploadUrl'));
      await uploadToSignedUrl(wavTarget, draft.wav.uri, draft.wav.mime, (v) => setProgress({ label: t('track.uploadingWav'), value: v }));
      let coverPath: string | null = null;
      if (draft.cover) {
        const coverTarget = await api.trackUploadUrl('copertina', { file_name: draft.cover.name, content_type: draft.cover.mime, size: draft.cover.size, larghezza: draft.cover.width, altezza: draft.cover.height });
        if (!coverTarget) throw new Error(t('producer.beat.noUploadUrl'));
        await uploadToSignedUrl(coverTarget, draft.cover.uri, draft.cover.mime, (v) => setProgress({ label: t('track.uploadingCover'), value: v }));
        coverPath = coverTarget.path;
      }
      const result = await api.submitTrack(d, { wav_path: wavTarget.path, copertina_path: coverPath });
      status.setData(() => ({ ...result, submitted: true }));
      await AsyncStorage.removeItem(draftKey).catch(() => {});
      void status.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setProgress(null);
      setBusy(null);
    }
  };

  const s = status.data;
  const due = s?.dueAt ?? entry.data?.trackDueAt ?? null;

  if (s?.submitted) {
    const sd = s.data;
    const rows: [string, string | undefined][] = [
      [t('track.fields.title'), sd.title], [t('track.fields.artist'), sd.artistName], [t('fields.genre'), sd.genre], [t('track.fields.language'), sd.language],
      [t('track.fields.explicit'), sd.explicit == null ? undefined : sd.explicit ? t('common.yes') : t('common.no')], [t('track.fields.author'), sd.lyricsAuthor], [t('track.fields.producer'), sd.producer],
    ];
    return (
      <Screen testID="screen-track-sent" onRefresh={status.refresh}>
        <BackHeader eyebrow={t('track.eyebrow')} title={t('track.sentTitle')} />
        <Notice kind="ok" title={s.statusText ?? (s.status ? t(`track.status.${['brano_caricato', 'controllato', 'online'].includes(s.status) ? s.status : 'brano_caricato'}`) : t('track.status.brano_caricato'))} text={t('track.sentText')} />
        <Card>
          {s.wavName ? <T v="title">{s.wavName}</T> : null}
          {rows.filter(([, v]) => !!v).map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <T v="small">{k}</T>
              <T v="small" color={colors.text} style={{ flex: 1, textAlign: 'right' }}>{v}</T>
            </View>
          ))}
        </Card>
        {s.spotifyUrl ? <LinkText label={t('common.spotifyLink')} color={colors.text} onPress={() => Linking.openURL(s.spotifyUrl as string).catch(() => {})} /> : null}
        <Stale updatedAt={status.updatedAt} stale={status.stale} />
      </Screen>
    );
  }

  const canUpload = !!app.data?.can.uploadTrack || !!entry.data?.canUploadTrack;
  return (
    <Screen testID="screen-track" footer={<Btn testID="track-send" label={t('track.send')} onPress={send} disabled={!valid || !canUpload || busy !== null} loading={busy === 'send'} />}>
      <BackHeader eyebrow={t('track.eyebrow')} title={t('track.title')} />
      {due ? <T v="small">{t('entry.dueBy', { date: formatDateTime(due, i18n.language) })}</T> : null}
      {!canUpload ? <Notice text={t('track.cannot')} /> : null}
      <Card accent={!!draft.wav}>
        <T v="title">{draft.wav ? draft.wav.name : t('track.wavTitle')}</T>
        <T v="small" color={colors.textSoft}>{draft.wav ? formatBytes(draft.wav.size) : t('track.wavText')}</T>
        <Btn testID="track-pick-wav" small variant="secondary" icon="upload" label={draft.wav ? t('track.replaceWav') : t('track.pickWav')} onPress={pickWav} loading={busy === 'wav'} disabled={busy !== null} />
      </Card>
      <T v="small">{t('track.why')}</T>
      <Field label={t('track.fields.title')} value={d.title} onChangeText={(v) => set('title', v)} testID="track-title" />
      <Field label={t('track.fields.artist')} value={d.artistName} onChangeText={(v) => set('artistName', v)} />
      <Field label={t('track.fields.spotify')} value={d.spotifyProfileUrl} onChangeText={(v) => set('spotifyProfileUrl', v)} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
      <Chips label={t('fields.genre')} options={GENRES.map((g) => ({ value: g, label: g }))} value={d.genre || null} onChange={(v) => set('genre', v)} />
      <Field label={t('track.fields.language')} value={d.language} onChangeText={(v) => set('language', v)} />
      <Chips label={t('track.fields.explicit')} options={[{ value: 'no', label: t('common.no') }, { value: 'si', label: t('common.yes') }]} value={d.explicit ? 'si' : 'no'} onChange={(v) => set('explicit', v === 'si')} />
      <Field label={t('track.fields.author')} value={d.lyricsAuthor} onChangeText={(v) => set('lyricsAuthor', v)} autoCapitalize="words" />
      <Field label={t('track.fields.producer')} value={d.producer} onChangeText={(v) => set('producer', v)} />
      <Field label={t('track.fields.lyrics')} value={d.lyrics} onChangeText={(v) => set('lyrics', v)} multiline />
      <Card accent={!!draft.cover}>
        <T v="title">{t('track.coverTitle', { side: COVER_SIDE })}</T>
        <T v="small" color={colors.textSoft}>{draft.cover ? `${draft.cover.name} · ${draft.cover.width}×${draft.cover.height}` : t('track.coverText')}</T>
        <Btn testID="track-pick-cover" small variant="secondary" label={draft.cover ? t('track.replaceCover') : t('track.pickCover')} onPress={pickCover} loading={busy === 'cover'} disabled={busy !== null} />
      </Card>
      <Notice kind="error" text={fileError} testID="track-file-error" />
      <Check label={t('track.decl.mine')} checked={d.declarations.mine} onChange={(v) => setDecl('mine', v)} testID="track-decl-1" />
      <Check label={t('track.decl.notOffensive')} checked={d.declarations.notOffensive} onChange={(v) => setDecl('notOffensive', v)} testID="track-decl-2" />
      <Check label={t('track.decl.distribution')} checked={d.declarations.distribution} onChange={(v) => setDecl('distribution', v)} testID="track-decl-3" />
      {progress ? <ProgressBar value={progress.value} label={progress.label} /> : null}
      <Notice kind="error" text={error} />
      <T v="small">{t('track.draftNote')}</T>
    </Screen>
  );
}
