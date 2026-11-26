import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/endpoints';
import type { Beat, BeatList } from '@/api/types';
import { HeartCounter, MediaRow, ReportModal } from '@/components/contest';
import { Btn, Chips, Field, Notice, Pill, Stale, T } from '@/components/ui';
import { useHidden } from '@/lib/hidden';
import { useHearts } from '@/lib/useHearts';
import { useResource } from '@/lib/useResource';
import { useSession } from '@/state/session';

export const beatSubtitle = (b: Beat) => [b.producerName, b.genre, b.bpm ? `${b.bpm} BPM` : null].filter(Boolean).join(' · ');

function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** 04 · I beat e i cuori (tutti i ruoli, fase cuori_beat) */
export function BeatCatalog({ tick = 0 }: { tick?: number }) {
  const { t } = useTranslation();
  const { session, app } = useSession();
  const [genre, setGenre] = useState<string>('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const uid = session?.user.id ?? 'anon';
  const list = useResource<BeatList>(`beats.${uid}.${genre}.${q}`, () => api.beats({ genere: genre || null, q: q || null }));
  const { hidden, hide } = useHidden();
  const [report, setReport] = useState<Beat | null>(null);

  const available = list.data?.heartsAvailable ?? app.data?.heartsAvailable ?? null;
  const total = list.data?.heartsTotal ?? app.data?.heartsTotal ?? null;
  const { hearts, toggle, error } = useHearts('beat', list.data?.items ?? null, available);
  const canVote = !!app.data?.can.giveHearts;

  const refreshList = list.refresh;
  useEffect(() => {
    if (tick) void refreshList();
  }, [tick, refreshList]);

  // i generi restano quelli della prima risposta, così i filtri non spariscono filtrando
  const [genres, setGenres] = useState<{ name: string; count: number | null }[]>([]);
  useEffect(() => {
    if (list.data?.genres.length) setGenres(list.data.genres);
  }, [list.data?.genres]);

  const items = useMemo(() => (list.data?.items ?? []).filter((b) => !hidden[b.id]), [list.data, hidden]);

  return (
    <View style={{ gap: 14 }} testID="beat-catalog">
      <Pill dot label={t('beats.phasePill')} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <T v="h1">{t('beats.title')}</T>
        {list.data?.total != null ? <T v="small">{t('beats.inContest', { count: list.data.total })}</T> : null}
      </View>
      <HeartCounter available={hearts.available} total={total} caption={t('hearts.moveUntilClose')} />
      {!canVote ? <Notice text={t('hearts.cannotVote')} /> : null}
      <Notice kind="error" text={error} testID="hearts-error" />
      <Field label={t('beats.search')} value={search} onChangeText={setSearch} autoCorrect={false} returnKeyType="search" testID="beat-search" />
      {genres.length ? (
        <Chips
          label={t('beats.genre')}
          value={genre}
          onChange={setGenre}
          options={[{ value: '', label: t('common.all') }, ...genres.map((g) => ({ value: g.name, label: g.count != null ? `${g.name} · ${g.count}` : g.name }))]}
        />
      ) : null}
      <Notice kind="error" text={list.data ? null : list.error} />
      {items.map((b, i) => (
        <MediaRow
          key={b.id}
          index={i}
          id={b.id}
          title={b.title}
          subtitle={beatSubtitle(b)}
          previewUrl={b.previewUrl}
          hearts={hearts.counts[b.id] ?? null}
          hearted={!!hearts.given[b.id]}
          heartDisabled={!canVote}
          onHeart={() => void toggle(b.id)}
          onReport={() => setReport(b)}
          mine={b.mine}
        />
      ))}
      {list.data && !items.length ? <T v="body">{t('beats.empty')}</T> : null}
      {list.loading && !list.data ? <T v="small">{t('common.loading')}</T> : null}
      <T v="small">{t('beats.footnote')}</T>
      <Stale updatedAt={list.updatedAt} stale={list.stale} />
      <ReportModal target={report ? { type: 'beat', id: report.id, title: report.title } : null} onClose={() => setReport(null)} onHidden={hide} />
    </View>
  );
}

/** 05 · I 10 beat scelti: come li pubblica l'Admin, senza punteggi. */
export function Top10({ tick = 0, onPick, pickedId }: { tick?: number; onPick?: (b: Beat) => void; pickedId?: string | null }) {
  const { t } = useTranslation();
  const { session, me } = useSession();
  const list = useResource<BeatList>(`top10.${session?.user.id ?? 'anon'}`, api.top10);
  const { hidden, hide } = useHidden();
  const [report, setReport] = useState<Beat | null>(null);

  const refreshList = list.refresh;
  useEffect(() => {
    if (tick) void refreshList();
  }, [tick, refreshList]);

  const items = (list.data?.items ?? []).filter((b) => !hidden[b.id]);
  const isProducer = me.data?.role === 'producer';
  const mineIn = items.some((b) => b.mine);

  return (
    <View style={{ gap: 14 }} testID="top10">
      {!onPick ? (
        <>
          <Pill label={t('top10.pill')} tone="muted" />
          <T v="h1">{t('top10.title')}</T>
          <T v="body">{t('top10.intro')}</T>
        </>
      ) : null}
      <Notice kind="error" text={list.data ? null : list.error} />
      {isProducer && list.data && items.length > 0 && !mineIn && !onPick ? <Notice text={list.data.note ?? t('top10.notIn')} /> : null}
      {items.map((b) => (
        <View key={b.id} style={{ gap: 6 }}>
          <MediaRow id={b.id} title={b.title} subtitle={beatSubtitle(b)} previewUrl={b.previewUrl} hearts={b.hearts} onReport={() => setReport(b)} mine={b.mine} />
          {onPick ? (
            <Btn small variant={pickedId === b.id ? 'primary' : 'secondary'} label={pickedId === b.id ? t('entry.beatChosen') : t('entry.chooseThis', { title: b.title })} onPress={() => onPick(b)} disabled={pickedId === b.id} />
          ) : null}
        </View>
      ))}
      {list.data && !items.length ? <T v="body">{t('top10.empty')}</T> : null}
      {!onPick && me.data?.role === 'artista' ? <Btn label={t('top10.join')} icon="arrow" onPress={() => router.navigate('/artisti')} /> : null}
      <Stale updatedAt={list.updatedAt} stale={list.stale} />
      <ReportModal target={report ? { type: 'beat', id: report.id, title: report.title } : null} onClose={() => setReport(null)} onHidden={hide} />
    </View>
  );
}
