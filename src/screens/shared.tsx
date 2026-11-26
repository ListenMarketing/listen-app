import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Me, Phase } from '@/api/types';
import { PHASES } from '@/api/types';
import { Icon } from '@/components/Icon';
import { Btn, Notice, T } from '@/components/ui';
import { getPushStatus, type PushStatus } from '@/lib/notifications';
import { colors, fonts } from '@/lib/theme';

export const phaseAtLeast = (phase: Phase, min: Phase) => PHASES.indexOf(phase) >= PHASES.indexOf(min);

export function RoleChip({ me }: { me: Me | null }) {
  const { t } = useTranslation();
  if (!me?.role) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.profileOf', { role: t(`roles.${me.role}`) })}
      onPress={() => router.navigate('/io')}
      style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}
    >
      <Icon name="user" size={18} strokeWidth={1.8} />
      <T v="small" style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{t(`roles.${me.role}`)}</T>
    </Pressable>
  );
}

/** Scheda Marketing in home (01d): solo il rimando al sito. */
export function MarketingCard() {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('marketing.title')}. ${t('marketing.cardText')}`}
      onPress={() => router.navigate('/marketing')}
      style={{ padding: 14, borderRadius: 18, backgroundColor: 'rgba(113,11,255,0.24)', borderWidth: 1, borderColor: 'rgba(165,120,255,0.45)', flexDirection: 'row', alignItems: 'center', gap: 14 }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="megaphone" size={22} color="#FFFFFF" strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <T v="eyebrow" style={{ color: colors.violetSoft, fontSize: 10 }}>{t('marketing.cardEyebrow')}</T>
        <T v="title" style={{ fontSize: 16 }}>{t('marketing.title')}</T>
        <T v="small" color={colors.textSoft}>{t('marketing.cardText')}</T>
      </View>
      <Icon name="external" size={18} color={colors.violetSoft} strokeWidth={2.2} />
    </Pressable>
  );
}

/** Ogni schermata di attesa ha il bottone per attivare le notifiche. */
export function NotifyButton() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PushStatus | null>(null);
  useEffect(() => {
    void getPushStatus().then(setStatus);
  }, []);
  if (status === 'granted') return <Notice kind="ok" text={t('notifications.active')} />;
  return <Btn variant="secondary" small icon="bell" label={t('notifications.enable')} onPress={() => router.push('/notifiche')} testID="enable-notifications" />;
}

