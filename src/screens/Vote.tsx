import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/endpoints';
import type { ContestTrack, Ranking as RankingData, RankingRow, TrackList } from '@/api/types';
import { HeartCounter, MediaRow, PlayButton, ReportModal } from '@/components/contest';
import { BackHeader, Btn, Card, Field, LinkText, Notice, Pill, Screen, Select, Stale, T } from '@/components/ui';
import { useHidden } from '@/lib/hidden';
import { colors } from '@/lib/theme';
import { useHearts } from '@/lib/useHearts';
import { useResource } from '@/lib/useResource';
import { useSession } from '@/state/session';

const open = (url: string) => Linking.openURL(url).catch(() => {});

function useVotableRegions(listRegions: string[] | undefined) {
  const { me, app } = useSession();
  const mine = me.data?.region ?? null;
  const regions = listRegions?.length ? listRegions : (app.data?.votableRegions ?? []);
  // si cambia regione solo se l'Admin lo consente (arriva dalle API)
  const canChange = !!app.data?.can.changeRegion && regions.length > 1;
  return { mine, regions, canChange };
}

/** 09 · Cuori ai brani della regione */
export function Vote({ tick = 0 }: { tick?: number }) {
  const { t } = useTranslation();
  const { session, app } = useSession();
  const uid = session?.user.id ?? 'anon';
  const [region, setRegion] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const list = useResource<TrackList>(`tracks.${uid}.${region ?? ''}`, () => api.tracks(region));
  const refreshList = list.refresh;
  useEffect(() => {
    if (tick) void refreshList();
  }, [tick, refreshList]);
  const { mine, regions, canChange } = useVotableRegions(list.data?.votableRegions);
  const shown = list.data?.region ?? region ?? mine;
  const { hidden, hide } = useHidden();
  const [report, setReport] = useState<ContestTrack | null>(null);

  const available = list.data?.heartsAvailable ?? app.data?.heartsAvailable ?? null;
  const total = list.data?.heartsTotal ?? app.data?.heartsTotal ?? null;
  const { hearts, toggle, error } = useHearts('brano', list.data?.items ?? null, available, shown);
  const canVote = !!app.data?.can.giveHearts;

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list.data?.items ?? []).filter((x) => !hidden[x.id] && (!q || `${x.title} ${x.artistName ?? ''}`.toLowerCase().includes(q)));
  }, [list.data, hidden, search]);

  return (
    <View style={{ gap: 14 }} testID="vote">
      <Pill dot label={t('vote.pill')} />
      <T v="h1">{shown ?? t('vote.title')}</T>
      <T v="body">{t('vote.intro')}</T>
      {canChange ? <Select label={t('vote.changeRegion')} value={shown} onChange={setRegion} options={regions.map((r) => ({ value: r, label: r }))} /> : null}
      <HeartCounter available={hearts.available} total={total} caption={t('hearts.moveUntilClose')} />
      {!canVote ? <Notice text={t('hearts.cannotVote')} /> : null}
      <Notice kind="error" text={error} testID="hearts-error" />
      <Field label={t('vote.search')} value={search} onChangeText={setSearch} autoCorrect={false} returnKeyType="search" />
      <Notice kind="error" text={list.data ? null : list.error} />
      {items.map((x, i) => (
        <MediaRow
          key={x.id}
          index={i}
          id={x.id}
          title={x.title}
          subtitle={[x.artistName, x.genre, x.beatLabel ? t('vote.onBeat', { beat: x.beatLabel }) : null].filter(Boolean).join(' · ')}
          previewUrl={x.previewUrl}
          hearts={hearts.counts[x.id] ?? null}
          hearted={!!hearts.given[x.id]}
          heartDisabled={!canVote}
          onHeart={() => void toggle(x.id)}
          onReport={() => setReport(x)}
          spotifyUrl={x.spotifyUrl}
          onOpenSpotify={() => x.spotifyUrl && open(x.spotifyUrl)}
          mine={x.mine}
        />
      ))}
      {list.data && !items.length ? <T v="body">{t('vote.empty')}</T> : null}
      {list.loading && !list.data ? <T v="small">{t('common.loading')}</T> : null}
      <Stale updatedAt={list.updatedAt} stale={list.stale} />
      <ReportModal target={report ? { type: 'brano', id: report.id, title: report.title } : null} onClose={() => setReport(null)} onHidden={hide} />
    </View>
  );
}

function RankRow({ row }: { row: RankingRow }) {
  const { t } = useTranslation();
  const title = [row.artistName, row.title].filter(Boolean).join(' · ');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft }}>
      {row.previewUrl ? <PlayButton id={`rank-${row.id}`} url={row.previewUrl} title={row.title ?? title} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="title" style={{ fontSize: 15 }}>{title}</T>
        {row.detail ? <T v="small">{row.detail}</T> : null}
        {row.spotifyUrl ? <LinkText label={t('common.spotifyLink')} color={colors.text} onPress={() => open(row.spotifyUrl as string)} /> : null}
      </View>
    </View>
  );
}

/** 10 · I passati e le wild card della regione, come pubblicati dall'Admin: senza numeri. */
export function Ranking({ tick = 0 }: { tick?: number }) {
  const { t } = useTranslation();
  const { session } = useSession();
  const [region, setRegion] = useState<string | null>(null);
  const data = useResource<RankingData>(`ranking.${session?.user.id ?? 'anon'}.${region ?? ''}`, () => api.ranking(region));
  const refreshData = data.refresh;
  useEffect(() => {
    if (tick) void refreshData();
  }, [tick, refreshData]);
  const { mine, regions } = useVotableRegions(undefined);
  const shown = data.data?.region ?? region ?? mine;
  const r = data.data;
  return (
    <View style={{ gap: 14 }} testID="ranking">
      <Pill label={t('ranking.pill')} tone="muted" />
      <T v="h1">{shown ?? t('ranking.title')}</T>
      {r?.intro ? <T v="body">{r.intro}</T> : null}
      {regions.length > 1 ? <Select label={t('fields.region')} value={shown} onChange={setRegion} options={regions.map((x) => ({ value: x, label: x }))} /> : null}
      <Notice kind="error" text={r ? null : data.error} />
      {r && !r.published ? <Notice text={t('ranking.notYet')} /> : null}
      {r?.passed.length ? <T v="h2">{t('ranking.passed')}</T> : null}
      {r?.passed.map((row, i) => <RankRow key={row.id || i} row={row} />)}
      {r?.wildcards.length ? (
        <>
          <T v="h2">{t('ranking.wildcards')}</T>
          {r.wildcardText ? <T v="body">{r.wildcardText}</T> : null}
          {r.wildcards.map((row, i) => <RankRow key={row.id || i} row={row} />)}
        </>
      ) : null}
      <Btn variant="secondary" small label={t('ranking.finalLink')} icon="chevron" onPress={() => router.push('/finale')} />
      <Stale updatedAt={data.updatedAt} stale={data.stale} />
    </View>
  );
}

/** 11 · L'evento finale e il premio: testi dalle API; il premio compare solo dalla data decisa in Admin. */
export function Finale() {
  const { t } = useTranslation();
  const { app } = useSession();
  const f = app.data?.finale;
  return (
    <View style={{ gap: 14 }} testID="finale">
      <Pill label={t('finale.pill')} tone="muted" />
      <T v="h1">{f?.title ?? t('finale.title')}</T>
      {f?.text ? <T v="body">{f.text}</T> : <T v="body">{t('finale.pending')}</T>}
      {f?.prizeVisible && f.prize ? (
        <Card accent>
          <T v="eyebrow" color={colors.accent}>{t('finale.prize')}</T>
          <T v="body" color={colors.text}>{f.prize}</T>
        </Card>
      ) : null}
      <Btn variant="secondary" small label={t('finale.rankingLink')} icon="chevron" onPress={() => router.push('/classifica')} />
    </View>
  );
}

export function RankingScreen() {
  const { t } = useTranslation();
  return (
    <Screen testID="screen-ranking">
      <BackHeader eyebrow={t('artists.badge')} title={t('ranking.title')} />
      <Ranking />
    </Screen>
  );
}

export function FinaleScreen() {
  const { t } = useTranslation();
  const { app } = useSession();
  return (
    <Screen testID="screen-finale" onRefresh={app.refresh}>
      <BackHeader eyebrow={t('artists.badge')} title={t('finale.title')} />
      <Finale />
    </Screen>
  );
}
