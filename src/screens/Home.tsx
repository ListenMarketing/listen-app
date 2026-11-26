import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/endpoints';
import type { AppState, Interest, Me } from '@/api/types';
import { Countdown } from '@/components/contest';
import { Icon } from '@/components/Icon';
import { Btn, Card, LogoHeader, Notice, Pill, Screen, Stale, T } from '@/components/ui';
import { colors } from '@/lib/theme';
import { useResource } from '@/lib/useResource';
import { useSession } from '@/state/session';
import { ArtistiSection, MyPage } from './Artisti';
import { BeatCatalog, Top10 } from './Beats';
import { MarketingCard, NotifyButton, RoleChip } from './shared';
import { Finale, Ranking, Vote } from './Vote';

function nextLabel(app: AppState, t: (k: string) => string) {
  return app.nextPhase ? t(`phases.countdown.${app.nextPhase}`) : t('phases.countdown.generic');
}

function CountdownCard({ app, children }: { app: AppState; children?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <Card>
      <Countdown target={app.nextPhaseAt} label={nextLabel(app, t)} />
      {children}
    </Card>
  );
}

/** 01 · Home del producer in fase consegna_beat */
function ProducerHome({ app }: { app: AppState }) {
  const { t } = useTranslation();
  return (
    <>
      <Pill dot label={t('home.producer.pill')} />
      <T v="h1">{t('home.producer.title')}</T>
      <T v="body">{t('home.producer.intro')}</T>
      <CountdownCard app={app}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          {app.counts.beats != null ? <T v="small">{t('home.beatsDelivered', { count: app.counts.beats })}</T> : <View />}
          <T v="small" style={{ flex: 1, textAlign: 'right' }}>{t('home.producer.lockNote')}</T>
        </View>
      </CountdownCard>
      <Btn testID="upload-beat" label={t('home.producer.cta')} icon="arrow" onPress={() => router.push('/beat')} disabled={!app.can.uploadBeat} />
      {!app.can.uploadBeat ? <Notice text={t('home.producer.cannot')} /> : null}
      <Btn variant="secondary" small label={t('tabs.artisti')} onPress={() => router.navigate('/artisti')} />
      <NotifyButton />
    </>
  );
}

/** 01b · Attesa (artista, pubblico, studio) con «Prenota il tuo slot» solo per l'artista */
function WaitingBeats({ app, me }: { app: AppState; me: Me }) {
  const { t } = useTranslation();
  const isArtist = me.role === 'artista';
  const interest = useResource<Interest | null>(isArtist ? `interest.${me.id ?? 'me'}` : null, api.interest);
  const booked = !!interest.data;
  return (
    <>
      <Pill dot label={t('home.waitBeats.pill')} />
      <T v="h1">{t('home.waitBeats.title')}</T>
      <T v="body">{t('home.waitBeats.intro')}</T>
      <CountdownCard app={app}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          {app.counts.beats != null ? <T v="small">{t('home.beatsDelivered', { count: app.counts.beats })}</T> : <View />}
          <T v="small">{t('home.weNotify')}</T>
        </View>
      </CountdownCard>
      {isArtist ? (
        <Pressable
          testID="slot-card"
          accessibilityRole="button"
          accessibilityLabel={booked ? `${t('home.slot.bookedTitle')}. ${t('home.slot.edit')}` : `${t('home.slot.title')}. ${t('home.slot.text')}`}
          onPress={() => router.push('/slot')}
          style={{ padding: 16, borderRadius: 20, backgroundColor: booked ? colors.card : colors.accent, borderWidth: 1, borderColor: booked ? colors.green : colors.accent, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <T v="title" color={booked ? colors.text : colors.onAccent}>{booked ? t('home.slot.bookedTitle') : t('home.slot.title')}</T>
            <T v="small" style={{ fontSize: 13, color: booked ? colors.textSoft : colors.onAccent }}>{booked ? t('home.slot.edit') : t('home.slot.text')}</T>
          </View>
          <Icon name={booked ? 'check' : 'arrow'} color={booked ? colors.green : colors.onAccent} strokeWidth={2.2} />
        </Pressable>
      ) : null}
      <NotifyButton />
    </>
  );
}

/** 09a · Attesa durante Chiamarsi Artisti (producer, pubblico, studio; artista non iscritto) */
function WaitingArtists({ app, me }: { app: AppState; me: Me }) {
  const { t } = useTranslation();
  return (
    <>
      <Pill dot label={t('home.waitArtists.pill')} />
      <T v="h1">{t('home.waitArtists.title')}</T>
      <T v="body">{t('home.waitArtists.intro')}</T>
      <CountdownCard app={app}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          {app.counts.tracks != null ? <T v="small">{t('home.tracksDelivered', { count: app.counts.tracks })}</T> : <View />}
          <T v="small">{t('home.weNotify')}</T>
        </View>
      </CountdownCard>
      <Btn variant="secondary" small label={t('home.waitArtists.top10')} icon="chevron" onPress={() => router.navigate('/producer')} />
      {me.role === 'artista' ? <Btn small label={t('home.waitArtists.join')} icon="arrow" onPress={() => router.navigate('/artisti')} /> : null}
      <NotifyButton />
    </>
  );
}

function Preparing({ app }: { app: AppState }) {
  const { t } = useTranslation();
  return (
    <>
      <Pill label={app.editionName ?? 'Chiamarsi'} tone="muted" />
      <T v="h1">{t('home.preparing.title')}</T>
      <T v="body">{t('home.preparing.intro')}</T>
      <CountdownCard app={app} />
      <NotifyButton />
    </>
  );
}

/** Lo studio resta «in verifica» finché Listen non lo approva, come l'agenzia sul sito. */
function PendingStudio() {
  const { t } = useTranslation();
  return <Notice title={t('home.pendingStudio.title')} text={t('home.pendingStudio.text')} />;
}

/** Home: dipende dal ruolo e dalla fase che arriva da `state`. */
export function HomeScreen() {
  const { t } = useTranslation();
  const { me, app, refreshAll } = useSession();
  const [tick, setTick] = useState(0);
  const m = me.data;
  const a = app.data;
  if (!m || !a) return null;

  const enrolled = m.role === 'artista' && m.hasEntry;
  const body = (() => {
    switch (a.phase) {
      case 'preparazione':
        return <Preparing app={a} />;
      case 'consegna_beat':
        return m.role === 'producer' ? <ProducerHome app={a} /> : <WaitingBeats app={a} me={m} />;
      case 'cuori_beat':
        return <BeatCatalog tick={tick} />;
      case 'top10':
        return <Top10 tick={tick} />;
      case 'iscrizioni':
      case 'sessioni':
      case 'consegna_brani':
        if (enrolled) return <MyPage tick={tick} />;
        if (m.role === 'artista' && (a.can.checkout || a.can.redeem || a.phase === 'iscrizioni')) return <ArtistiSection tick={tick} />;
        return <WaitingArtists app={a} me={m} />;
      case 'cuori_brani':
        return <Vote tick={tick} />;
      case 'classifiche':
        return <Ranking tick={tick} />;
      case 'finale':
      case 'chiusa':
        return <Finale />;
    }
  })();

  return (
    <Screen
      testID="screen-home"
      edges={['top']}
      onRefresh={async () => {
        await refreshAll();
        setTick((x) => x + 1);
      }}
    >
      <LogoHeader badge="CHIAMARSI" right={<RoleChip me={m} />} />
      {m.role === 'studio' && m.pendingApproval ? <PendingStudio /> : null}
      {body}
      <MarketingCard />
      <Stale updatedAt={app.updatedAt} stale={app.stale || me.stale} />
      {app.stale ? <T v="small" style={{ textAlign: 'center' }}>{t('common.actionsNeedNetwork')}</T> : null}
    </Screen>
  );
}
