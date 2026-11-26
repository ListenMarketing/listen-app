import React, { useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, View, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius, space } from '@/lib/theme';
import { formatDateTime } from '@/lib/format';
import { Icon, type IconName } from './Icon';

/* ───────── Testo: i caratteri seguono le impostazioni del telefono (allowFontScaling) ───────── */

type Variant = 'h1' | 'h2' | 'title' | 'body' | 'small' | 'label' | 'eyebrow' | 'button';
const variants: Record<Variant, TextStyle> = {
  h1: { fontFamily: fonts.title, fontSize: 32, lineHeight: 34, letterSpacing: -0.6, color: colors.text },
  h2: { fontFamily: fonts.title, fontSize: 22, lineHeight: 26, letterSpacing: -0.3, color: colors.text },
  title: { fontFamily: fonts.title, fontSize: 17, lineHeight: 21, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSoft },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted },
  label: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, color: colors.muted },
  eyebrow: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 15, letterSpacing: 0.9, color: colors.muted, textTransform: 'uppercase' },
  button: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 20, color: colors.onAccent },
};

export function T({ v = 'body', color, style, ...rest }: TextProps & { v?: Variant; color?: string }) {
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={v === 'h1' ? 1.6 : 2}
      accessibilityRole={v === 'h1' || v === 'h2' ? 'header' : rest.accessibilityRole}
      style={[variants[v], color ? { color } : null, style]}
    />
  );
}

/* ───────── Pagina ───────── */

type ScreenProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
  onRefresh?: () => void | Promise<unknown>;
  edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Screen({ children, footer, scroll = true, onRefresh, edges = ['top', 'bottom'], contentStyle, testID }: ScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const doRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <SafeAreaView style={s.safe} edges={edges} testID={testID}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={s.flex}
            contentContainerStyle={[s.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.accent} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[s.flex, s.content, contentStyle]}>{children}</View>
        )}
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ───────── Bottoni veri, con etichetta e stato ───────── */

type BtnProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName | null;
  small?: boolean;
  hint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function Btn({ label, onPress, variant = 'primary', disabled, loading, icon, small, hint, testID, style }: BtnProps) {
  const off = !!disabled || !!loading;
  const fg =
    variant === 'primary' ? (off ? colors.disabledText : colors.onAccent) : variant === 'danger' ? colors.red : off ? colors.muted : colors.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        variant === 'primary' && { backgroundColor: off ? colors.disabledBg : colors.accent },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
        variant === 'danger' && { borderWidth: 1, borderColor: colors.red },
        pressed && !off && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : null}
      <T v="button" style={[{ color: fg, flexShrink: 1, textAlign: 'center' }, (small || variant !== 'primary') && { fontSize: 14, fontFamily: fonts.bodySemi }]}>
        {label}
      </T>
      {icon && !loading ? <Icon name={icon} size={18} color={fg} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}

export function LinkText({ label, onPress, color = colors.accent, testID }: { label: string; onPress: () => void; color?: string; testID?: string }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} hitSlop={10} testID={testID} style={{ minHeight: 44, justifyContent: 'center' }}>
      <T v="body" style={{ color, fontFamily: fonts.bodySemi, textDecorationLine: 'underline' }}>{label}</T>
    </Pressable>
  );
}

/* ───────── Campi ───────── */

export function Field({ label, error, hint, style, ...input }: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T v="label">{label}</T>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        {...input}
        style={[s.input, input.multiline && { height: 120, paddingTop: 12, textAlignVertical: 'top' }, !!error && { borderColor: colors.red }, style]}
      />
      {hint && !error ? <T v="small">{hint}</T> : null}
      {error ? <T v="small" color={colors.red} accessibilityLiveRegion="polite">{error}</T> : null}
    </View>
  );
}

export function Chips({ label, options, value, onChange }: { label?: string; options: { value: string; label: string }[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label ? <T v="label">{label}</T> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ selected: on, checked: on }}
              onPress={() => onChange(o.value)}
              style={[s.chip, on && { backgroundColor: colors.accent, borderColor: colors.accent }]}
            >
              <T v="small" style={{ color: on ? colors.onAccent : colors.text, fontFamily: fonts.bodySemi, fontSize: 13 }}>{o.label}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Check({ label, checked, onChange, testID, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; testID?: string; children?: React.ReactNode }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={s.check}
    >
      <View style={[s.checkBox, checked && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
        {checked ? <Icon name="check" size={16} color={colors.onAccent} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children ?? <T v="body" color={colors.text}>{label}</T>}</View>
    </Pressable>
  );
}

/** Scelta da un elenco (regione, studio…): un bottone che apre una lista a tutto schermo. */
export function Select({ label, value, options, onChange, placeholder, error }: { label: string; value: string | null; options: { value: string; label: string }[]; onChange: (v: string) => void; placeholder?: string; error?: string | null }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      <T v="label">{label}</T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? placeholder ?? ''}`}
        onPress={() => setOpen(true)}
        style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, !!error && { borderColor: colors.red }]}
      >
        <T v="body" style={{ fontSize: 15, color: current ? colors.text : colors.muted, flex: 1 }} numberOfLines={1}>{current?.label ?? placeholder ?? ''}</T>
        <Icon name="chevron" size={18} color={colors.muted} />
      </Pressable>
      {error ? <T v="small" color={colors.red}>{error}</T> : null}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} presentationStyle="pageSheet">
        <SafeAreaView style={s.safe}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.page }}>
            <T v="h2">{label}</T>
            <IconBtn name="close" label={t('common.close')} onPress={() => setOpen(false)} />
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            contentContainerStyle={{ paddingHorizontal: space.page, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: item.value === value }}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                style={s.option}
              >
                <T v="body" color={colors.text} style={{ fontSize: 16, flex: 1 }}>{item.label}</T>
                {item.value === value ? <Icon name="check" color={colors.accent} /> : null}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

/* ───────── Contenitori e avvisi ───────── */

export function Card({ children, style, accent }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; accent?: boolean }) {
  return <View style={[s.card, accent && { borderColor: colors.accent, backgroundColor: colors.accentSoft }, style]}>{children}</View>;
}

export function Notice({ kind = 'info', text, title, testID }: { kind?: 'info' | 'error' | 'ok'; text?: string | null; title?: string; testID?: string }) {
  if (!text && !title) return null;
  const c = kind === 'error' ? colors.red : kind === 'ok' ? colors.green : colors.muted;
  const bg = kind === 'error' ? colors.redSoft : kind === 'ok' ? colors.greenSoft : 'transparent';
  return (
    <View testID={testID} accessibilityRole={kind === 'error' ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[s.notice, { borderColor: c, backgroundColor: bg }]}>
      {kind === 'ok' ? <Icon name="check" size={18} color={c} strokeWidth={2.5} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <T v="body" style={{ color: kind === 'info' ? colors.text : c, fontFamily: fonts.bodySemi }}>{title}</T> : null}
        {text ? <T v="small" style={{ color: kind === 'info' ? colors.textSoft : colors.text, fontSize: 13 }}>{text}</T> : null}
      </View>
    </View>
  );
}

/** «Aggiornato alle 17:42» — e, senza rete, dice che è l'ultima versione salvata. */
export function Stale({ updatedAt, stale }: { updatedAt: number | null; stale: boolean }) {
  const { t, i18n } = useTranslation();
  if (!updatedAt) return null;
  const when = formatDateTime(updatedAt, i18n.language);
  return (
    <T v="small" style={{ textAlign: 'center' }} color={stale ? colors.red : colors.muted}>
      {stale ? t('common.offlineCopy', { when }) : t('common.updatedAt', { when })}
    </T>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: pct }} style={{ gap: 6 }}>
      <View style={s.progressTrack}><View style={[s.progressFill, { width: `${pct}%` }]} /></View>
      <T v="small">{label} · {pct}%</T>
    </View>
  );
}

export function IconBtn({ name, label, onPress, color = colors.text, filled, testID, disabled, selected }: { name: IconName; label: string; onPress?: () => void; color?: string; filled?: boolean; testID?: string; disabled?: boolean; selected?: boolean }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }, disabled && { opacity: 0.45 }]}
    >
      <Icon name={name} color={color} filled={filled} size={20} />
    </Pressable>
  );
}

export function Pill({ label, tone = 'accent', dot }: { label: string; tone?: 'accent' | 'muted' | 'green' | 'red'; dot?: boolean }) {
  const c = tone === 'accent' ? colors.accent : tone === 'green' ? colors.green : tone === 'red' ? colors.red : colors.muted;
  return (
    <View style={[s.pill, { borderColor: c }]}>
      {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} /> : null}
      <T v="eyebrow" style={{ color: c, fontSize: 11 }}>{label}</T>
    </View>
  );
}

/* ───────── Intestazioni ───────── */

export function BackHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <IconBtn name="back" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} testID="back" />
      <View style={{ flex: 1, gap: 2 }}>
        {eyebrow ? <T v="eyebrow">{eyebrow}</T> : null}
        <T v="title" style={{ fontSize: 18 }} accessibilityRole="header">{title}</T>
      </View>
      {right}
    </View>
  );
}

export function LogoHeader({ badge, right }: { badge?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Image source={require('../../assets/listen-logo.png')} accessibilityLabel="Listen" style={{ height: 20, width: 77 }} resizeMode="contain" />
        {badge ? (
          <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.accentSoft }}>
            <T v="eyebrow" style={{ color: colors.accent, fontFamily: fonts.title }}>{badge}</T>
          </View>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.bg, padding: 24 }} accessibilityRole="progressbar" accessibilityLabel={label ?? t('common.loading')}>
      <ActivityIndicator color={colors.accent} />
      <T v="small">{label ?? t('common.loading')}</T>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.page, paddingTop: 18, paddingBottom: 28, gap: 16 },
  footer: { paddingHorizontal: space.page, paddingTop: 10, paddingBottom: 14, gap: 8, borderTopWidth: 1, borderTopColor: colors.borderSoft, backgroundColor: colors.bg },
  btn: { minHeight: 54, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnSmall: { minHeight: 48, borderRadius: radius.sm },
  input: { minHeight: 48, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, paddingHorizontal: 14, fontSize: 15, fontFamily: fonts.body },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  check: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 48, paddingVertical: 4 },
  checkBox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 16, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft, gap: 10 },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: radius.sm, borderWidth: 1 },
  progressTrack: { height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 8, backgroundColor: colors.accent },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
});
