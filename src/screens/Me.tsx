import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { Btn, Card, LinkText, LogoHeader, Notice, Screen, Stale, T } from '@/components/ui';
import { env } from '@/lib/env';
import { initials } from '@/lib/format';
import { getPushStatus, requestPushAndRegister, type PushStatus } from '@/lib/notifications';
import { colors } from '@/lib/theme';
import { useSession } from '@/state/session';
import { NotifyButton } from './shared';

/** Voce «Io» del menu: profilo, notifiche, privacy, esci, elimina il mio account. */
export function MeScreen() {
  const { t } = useTranslation();
  const { me, app, session, signOut, refreshAll } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const m = me.data;
  const links = app.data?.links;
  const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

  const doDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount();
      await signOut();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  // conferma in due passi, con la spiegazione di cosa resta (gli ordini)
  const askDelete = () => {
    Alert.alert(t('me.delete.title'), t('me.delete.text'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('me.delete.continue'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('me.delete.confirmTitle'), t('me.delete.confirmText'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('me.delete.confirm'), style: 'destructive', onPress: () => void doDelete() },
          ]),
      },
    ]);
  };

  return (
    <Screen testID="screen-me" edges={['top']} onRefresh={refreshAll}>
      <LogoHeader badge={t('tabs.io').toUpperCase()} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <T v="title" style={{ color: colors.onAccent, fontSize: 20 }}>{initials(m?.name)}</T>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="h2">{m?.name ?? ''}</T>
          <T v="small">{[m?.role ? t(`roles.${m.role}`) : null, m?.region, m?.city, m?.instagram].filter(Boolean).join(' · ')}</T>
          <T v="small">{m?.email ?? session?.user.email ?? ''}</T>
        </View>
      </View>
      {m?.role === 'studio' && m.pendingApproval ? <Notice title={t('home.pendingStudio.title')} text={t('home.pendingStudio.text')} /> : null}
      <T v="small">{t('role.changeNote')}</T>

      {m?.role === 'artista' ? <Btn small variant="secondary" icon="chevron" label={m.hasEntry ? t('entry.title') : t('tabs.artisti')} onPress={() => router.navigate('/artisti')} /> : null}
      {m?.role === 'producer' ? <Btn small variant="secondary" icon="chevron" label={t('producer.tab.yourBeat')} onPress={() => router.push('/beat')} /> : null}

      <Card>
        <T v="title">{t('notifications.title')}</T>
        <T v="small" color={colors.textSoft}>{t('notifications.short')}</T>
        <NotifyButton />
      </Card>

      <Card>
        <T v="title">{t('me.legal')}</T>
        <LinkText label={t('register.rules')} onPress={() => open(links?.rules ?? `${env.siteUrl}/chiamarsi/regolamento`)} />
        <LinkText label={t('register.privacy')} onPress={() => open(links?.privacy ?? `${env.siteUrl}/privacy`)} />
        <LinkText label={t('me.terms')} onPress={() => open(links?.terms ?? `${env.siteUrl}/termini`)} />
        <T v="small">{t('me.noTracking')}</T>
      </Card>

      <Btn testID="sign-out" variant="secondary" label={t('me.signOut')} onPress={() => void signOut()} />

      <Card>
        <T v="title">{t('me.delete.button')}</T>
        <T v="small" color={colors.textSoft}>{t('me.delete.text')}</T>
        <Notice kind="error" text={error} />
        <Btn testID="delete-account" variant="danger" small label={t('me.delete.button')} onPress={askDelete} loading={busy} />
      </Card>
      <Stale updatedAt={me.updatedAt} stale={me.stale} />
      <T v="small" style={{ textAlign: 'center' }}>Listen {env.appVersion}</T>
    </Screen>
  );
}

/**
 * «Attiva le notifiche»: spiega a cosa servono PRIMA di chiedere il permesso.
 * Si apre dopo il primo avvio completato, mai subito all'apertura dell'app.
 */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  React.useEffect(() => {
    void getPushStatus().then(setStatus);
  }, []);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const enable = async () => {
    setBusy(true);
    const s = await requestPushAndRegister();
    setStatus(s);
    setBusy(false);
    if (s === 'granted') close();
  };
  return (
    <Screen
      testID="screen-notifications"
      footer={
        <>
          <Btn testID="notifications-allow" label={t('notifications.enable')} icon="bell" onPress={enable} loading={busy} disabled={status === 'granted'} />
          <Btn testID="notifications-later" variant="ghost" label={t('notifications.later')} onPress={close} />
        </>
      }
    >
      <T v="eyebrow">Listen</T>
      <T v="h1">{t('notifications.title')}</T>
      <T v="body">{t('notifications.intro')}</T>
      <Card>
        {(['phases', 'hearts', 'deadlines', 'news'] as const).map((k) => (
          <T key={k} v="body" color={colors.text}>· {t(`notifications.items.${k}`)}</T>
        ))}
      </Card>
      <T v="small">{t('notifications.noAds')}</T>
      {status === 'granted' ? <Notice kind="ok" text={t('notifications.active')} /> : null}
      {status === 'denied' ? <Notice text={t('notifications.denied')} /> : null}
    </Screen>
  );
}
