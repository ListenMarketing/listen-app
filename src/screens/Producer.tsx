import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import type { Beat } from '@/api/types';
import { PlayButton } from '@/components/contest';
import { BackHeader, Btn, Card, Chips, Field, LogoHeader, Notice, Pill, ProgressBar, Screen, Stale, T } from '@/components/ui';
import { GENRES } from '@/lib/constants';
import { formatBytes, formatSeconds, normalizeInstagram } from '@/lib/format';
import { getAudioDuration } from '@/lib/player';
import { colors } from '@/lib/theme';
import { uploadToSignedUrl } from '@/lib/upload';
import { useResource } from '@/lib/useResource';
import { DEFAULT_BEAT_LIMITS, mimeFor, validateBeatFile, type BeatLimits } from '@/lib/validation';
import { useSession } from '@/state/session';
import { BeatCatalog, Top10, beatSubtitle } from './Beats';
import { phaseAtLeast, RoleChip } from './shared';

const genreOptions = GENRES.map((g) => ({ value: g, label: g }));

/** 02 · Candidatura producer: nome d'arte, città, Instagram, genere. */
export function CandidaturaScreen() {
  const { t } = useTranslation();
  const { me } = useSession();
  const p = me.data?.producer;
  const [stageName, setStageName] = useState(p?.stageName ?? me.data?.name ?? '');
  const [city, setCity] = useState(p?.city ?? me.data?.city ?? '');
  const [instagram, setInstagram] = useState(p?.instagram ?? me.data?.instagram ?? '');
  const [genre, setGenre] = useState<string | null>(p?.genre ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = stageName.trim().length >= 2 && city.trim().length >= 2 && !!genre;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await api.saveProfile({ nome_arte: stageName.trim(), citta: city.trim(), instagram: normalizeInstagram(instagram), genere: genre ?? undefined });
      me.setData((prev) => ({
        ...(prev ?? saved),
        ...saved,
        role: saved.role ?? prev?.role ?? null,
        playlistConfirmedAt: saved.playlistConfirmedAt ?? prev?.playlistConfirmedAt ?? null,
        producer: saved.producer ?? { stageName: stageName.trim(), city: city.trim(), instagram: normalizeInstagram(instagram), genre },
      }));
      router.replace('/beat');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen testID="screen-candidatura" footer={<Btn testID="candidatura-next" label={t('producer.apply.next')} icon="arrow" onPress={save} disabled={!valid} loading={busy} />}>
      <BackHeader eyebrow={t('producer.apply.eyebrow')} title={t('producer.apply.title')} />
      <Field label={t('fields.stageName')} value={stageName} onChangeText={setStageName} testID="cand-name" />
      <Field label={t('fields.city')} value={city} onChangeText={setCity} testID="cand-city" />
      <Field label={t('fields.instagram')} value={instagram} onChangeText={setInstagram} autoCapitalize="none" autoCorrect={false} placeholder="@" />
      <Chips label={t('producer.apply.genre')} options={genreOptions} value={genre} onChange={setGenre} />
      <Notice kind="error" text={error} />
      <T v="small">{t('producer.apply.free')}</T>
    </Screen>
  );
}

type Picked = { uri: string; name: string; size: number | null; mime: string; duration: number | null };

/** 03 · Il tuo beat: uno solo, gratis. WAV o MP3, massimo 30 secondi e 25 MB. */
export function MyBeatScreen() {
  const { t } = useTranslation();
  const { session, me, app } = useSession();
  const beat = useResource<Beat | null>(`mybeat.${session?.user.id ?? 'anon'}`, api.myBeat);
  const canEdit = !!app.data?.can.uploadBeat;
  const limits: BeatLimits = {
    maxSeconds: app.data?.limits.beatMaxSeconds ?? DEFAULT_BEAT_LIMITS.maxSeconds,
    maxBytes: app.data?.limits.beatMaxBytes ?? DEFAULT_BEAT_LIMITS.maxBytes,
  };

  const [file, setFile] = useState<Picked | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const [bpm, setBpm] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState<'pick' | 'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const current = beat.data;
  useEffect(() => {
    if (current) {
      setTitle(current.title);
      setGenre(current.genre);
      setBpm(current.bpm ? String(current.bpm) : '');
    } else if (me.data?.producer?.genre) {
      setGenre((g) => g ?? me.data?.producer?.genre ?? null);
    }
  }, [current, me.data?.producer?.genre]);

  // senza i dati della candidatura (02) si passa prima da lì
  const needsApplication = canEdit && !current && !beat.loading && !me.data?.producer?.stageName && !me.data?.city;

  const pick = async () => {
    setBusy('pick');
    setError(null);
    setRejected(null);
    setSaved(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/*'], copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const duration = await getAudioDuration(a.uri);
      const check = validateBeatFile({ name: a.name, mimeType: a.mimeType, size: a.size ?? null, durationSeconds: duration }, limits);
      if (!check.ok) {
        setFile(null);
        setRejected(
          t(`producer.beat.rejected.${check.reason}`, {
            name: a.name,
            duration: formatSeconds(duration),
            size: formatBytes(a.size ?? null),
            maxSeconds: limits.maxSeconds,
            maxMb: Math.round(limits.maxBytes / (1024 * 1024)),
          }),
        );
        return;
      }
      setFile({ uri: a.uri, name: a.name, size: a.size ?? null, mime: mimeFor(a.name, a.mimeType), duration });
      if (!title) setTitle(a.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    setBusy('save');
    setError(null);
    setSaved(false);
    try {
      let path: string | null = null;
      if (file) {
        const target = await api.beatUploadUrl({ file_name: file.name, content_type: file.mime, size: file.size, durata_secondi: file.duration });
        if (!target) throw new Error(t('producer.beat.noUploadUrl'));
        setProgress(0);
        await uploadToSignedUrl(target, file.uri, file.mime, setProgress);
        path = target.path;
      }
      const bpmNum = parseInt(bpm, 10);
      const result = await api.confirmBeat({ path, titolo: title.trim(), genere: genre ?? '', bpm: Number.isFinite(bpmNum) ? bpmNum : null });
      setFile(null);
      setSaved(true);
      if (result) beat.setData(() => result);
      void beat.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setProgress(null);
      setBusy(null);
    }
  };

  const remove = () => {
    Alert.alert(t('producer.beat.deleteTitle'), t('producer.beat.deleteText'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('producer.beat.delete'),
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          setError(null);
          try {
            await api.deleteBeat();
            beat.setData(() => null);
            setTitle('');
            setBpm('');
            setFile(null);
            setSaved(false);
            await beat.refresh();
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const canPublish = title.trim().length >= 1 && !!genre && (!!file || !!current);
  const statusKey = current?.status && ['caricato', 'in_gara', 'top10', 'escluso'].includes(current.status) ? current.status : null;

  return (
    <Screen
      testID="screen-my-beat"
      onRefresh={beat.refresh}
      footer={canEdit && !needsApplication ? <Btn testID="beat-publish" label={current ? t('producer.beat.save') : t('producer.beat.publish')} onPress={publish} disabled={!canPublish || busy !== null} loading={busy === 'save'} /> : undefined}
    >
      <BackHeader eyebrow={t('producer.beat.eyebrow')} title={t('producer.beat.title')} />
      {needsApplication ? (
        <>
          <T v="body">{t('producer.beat.needsApplication')}</T>
          <Btn label={t('producer.apply.title')} icon="arrow" onPress={() => router.replace('/candidatura')} />
        </>
      ) : (
        <>
          <Card accent={canEdit}>
            <T v="title">{t('producer.beat.oneEach')}</T>
            <T v="small" color={colors.textSoft} style={{ fontSize: 13 }}>
              {t('producer.beat.rules', { maxSeconds: limits.maxSeconds, maxMb: Math.round(limits.maxBytes / (1024 * 1024)) })}
            </T>
          </Card>

          {current ? (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <PlayButton id={`mine-${current.id}`} url={current.previewUrl} title={current.title} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="title">{current.title}</T>
                  <T v="small">{beatSubtitle(current)}</T>
                </View>
                {statusKey ? <Pill label={t(`producer.beat.status.${statusKey}`)} tone={statusKey === 'escluso' ? 'red' : statusKey === 'top10' ? 'accent' : 'green'} /> : null}
              </View>
              {current.status === 'escluso' && current.excludedReason ? <Notice kind="error" title={t('producer.beat.excludedReason')} text={current.excludedReason} /> : null}
            </Card>
          ) : !canEdit && !beat.loading ? (
            <Notice text={t('producer.beat.closedNoBeat')} />
          ) : null}

          {canEdit ? (
            <>
              {file ? (
                <Notice kind="ok" title={file.name} text={[formatSeconds(file.duration), formatBytes(file.size)].filter(Boolean).join(' · ')} testID="beat-file-ok" />
              ) : null}
              <Notice kind="error" text={rejected} testID="beat-file-rejected" />
              <Btn testID="beat-pick" variant="secondary" icon="upload" label={current || file ? t('producer.beat.replace') : t('producer.beat.pick')} onPress={pick} loading={busy === 'pick'} disabled={busy !== null} />
              <Field label={t('producer.beat.fieldTitle')} value={title} onChangeText={setTitle} maxLength={80} testID="beat-title" />
              <Chips label={t('producer.beat.fieldGenre')} options={genreOptions} value={genre} onChange={setGenre} />
              <Field label={t('producer.beat.fieldBpm')} value={bpm} onChangeText={(v) => setBpm(v.replace(/[^0-9]/g, '').slice(0, 3))} keyboardType="number-pad" testID="beat-bpm" />
              {progress != null ? <ProgressBar value={progress} label={t('producer.beat.uploading')} /> : null}
              {saved ? <Notice kind="ok" text={t('producer.beat.saved')} testID="beat-saved" /> : null}
              {current ? <Btn variant="danger" small label={t('producer.beat.delete')} onPress={remove} loading={busy === 'delete'} disabled={busy !== null} /> : null}
            </>
          ) : current ? (
            <Notice text={t('producer.beat.readOnly')} />
          ) : null}
          <Notice kind="error" text={error ?? (beat.data === null && beat.stale ? beat.error : null)} />
          <T v="small">{t('producer.apply.free')}</T>
          <Stale updatedAt={beat.updatedAt} stale={beat.stale} />
        </>
      )}
    </Screen>
  );
}

/** Voce «Producer» del menu: Chiamarsi Producer, secondo il ruolo e la fase. */
export function ProducerTab() {
  const { t } = useTranslation();
  const { me, app, refreshAll } = useSession();
  const [tick, setTick] = useState(0);
  const m = me.data;
  const a = app.data;
  if (!m || !a) return null;
  const isProducer = m.role === 'producer';
  return (
    <Screen
      testID="screen-producer"
      edges={['top']}
      onRefresh={async () => {
        await refreshAll();
        setTick((x) => x + 1);
      }}
    >
      <LogoHeader badge={t('producer.badge')} right={<RoleChip me={m} />} />
      {isProducer ? (
        <Card>
          <T v="title">{t('producer.tab.yourBeat')}</T>
          <T v="small" color={colors.textSoft}>{a.can.uploadBeat ? t('producer.tab.open') : t('producer.tab.closed')}</T>
          <Btn small label={a.can.uploadBeat ? t('home.producer.cta') : t('producer.tab.see')} icon="arrow" onPress={() => router.push('/beat')} testID="producer-my-beat" />
        </Card>
      ) : null}
      {a.phase === 'cuori_beat' ? (
        <BeatCatalog tick={tick} />
      ) : phaseAtLeast(a.phase, 'top10') ? (
        <Top10 tick={tick} />
      ) : (
        <>
          <T v="h1">{t('producer.tab.title')}</T>
          <T v="body">{isProducer ? t('producer.tab.introProducer') : t('producer.tab.introOthers')}</T>
        </>
      )}
    </Screen>
  );
}
