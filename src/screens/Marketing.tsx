import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import type { Marketing } from '@/api/types';
import { Icon, type IconName } from '@/components/Icon';
import { Btn, LogoHeader, Notice, Screen, Stale, T } from '@/components/ui';
import { env } from '@/lib/env';
import { colors } from '@/lib/theme';
import { useResource } from '@/lib/useResource';
import { useSession } from '@/state/session';
import { RoleChip } from './shared';

const ICONS: IconName[] = ['megaphone', 'note', 'user', 'studio'];
const FALLBACK = ['instagram', 'tiktok', 'talent', 'partners'] as const;

/**
 * 01d · Marketing: solo il rimando al sito. Nell'app non si compra nessun
 * servizio di marketing e non c'è nessun carrello.
 */
export function MarketingScreen() {
  const { t } = useTranslation();
  const { me } = useSession();
  const data = useResource<Marketing>('marketing', api.marketing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = me.data?.role ?? null;
  const isPublic = role === 'pubblico';
  const siteUrl = data.data?.siteUrl ?? env.siteUrl;

  // testi dalle API `marketing`; se non sono ancora arrivati, quelli del design
  const cards = data.data?.cards.length
    ? data.data.cards
    : FALLBACK.map((k) => ({ title: t(`marketing.cards.${k}.title`), text: t(`marketing.cards.${k}.text`), url: null as string | null }));

  const openSite = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isPublic) {
        // il pubblico apre il sito e basta
        await Linking.openURL(siteUrl);
      } else {
        // artista, producer e studio entrano già loggati con un link usa-e-getta
        const link = await api.siteLink();
        await Linking.openURL(link ?? siteUrl);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen testID="screen-marketing" edges={['top']} onRefresh={data.refresh}>
      <LogoHeader badge={t('tabs.marketing').toUpperCase()} right={<RoleChip me={me.data} />} />
      <T v="h1">{data.data?.title ?? t('marketing.title')}</T>
      <T v="body">{data.data?.intro ?? t('marketing.intro')}</T>
      <View style={{ gap: 10 }}>
        {cards.map((c, i) => (
          <Pressable
            key={c.title}
            accessibilityRole="button"
            accessibilityLabel={`${c.title}. ${c.text}. ${t('marketing.onSite')}`}
            onPress={openSite}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={ICONS[i % ICONS.length]} size={22} color="#FFFFFF" strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <T v="title" style={{ fontSize: 16 }}>{c.title}</T>
              <T v="small" color={colors.textSoft}>{c.text}</T>
              <T v="small" color={colors.violetSoft}>{t('marketing.onSite')}</T>
            </View>
          </Pressable>
        ))}
      </View>
      <Notice kind="error" text={error} />
      <Btn testID="marketing-open" label={t('marketing.open')} icon="external" onPress={openSite} loading={busy} />
      {isPublic ? <Notice text={data.data?.publicNote ?? t('marketing.publicNote')} testID="marketing-public" /> : null}
      <Stale updatedAt={data.updatedAt} stale={data.stale} />
    </Screen>
  );
}
