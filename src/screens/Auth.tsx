import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BackHeader, Btn, Card, Check, Field, LinkText, LogoHeader, Notice, Screen, T } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { authErrorMessage } from '@/lib/authErrors';
import { env } from '@/lib/env';
import { isEmail } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';
import { useSession } from '@/state/session';

const openSite = (path: string) => WebBrowser.openBrowserAsync(`${env.siteUrl}${path}`).catch(() => {});

/** 00 · Registrati su Listen (un account per app e sito) */
export function RegisterScreen() {
  const { t } = useTranslation();
  const { setPending } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length >= 2 && isEmail(email) && password.length >= 8 && accepted;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name: name.trim(), full_name: name.trim(), source: 'app', terms_accepted_at: new Date().toISOString() } },
      });
      if (err) throw err;
      // con la conferma dell'email attiva, un indirizzo già registrato torna senza identità
      if (data.user && data.user.identities && data.user.identities.length === 0) throw { code: 'user_already_exists' };
      if (!data.session) setPending({ email: email.trim().toLowerCase(), password });
    } catch (e) {
      setError(authErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen testID="screen-register">
      <LogoHeader right={<View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.border }}><T v="eyebrow">APP</T></View>} />
      <View style={{ gap: 10, marginTop: 8 }}>
        <T v="eyebrow">{t('onboarding.step', { n: 1 })}</T>
        <T v="h1">{t('register.title')}</T>
        <T v="body">{t('register.intro')}</T>
      </View>
      <Field label={t('register.name')} value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" textContentType="name" testID="register-name" />
      <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" testID="register-email" />
      <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint={t('register.passwordHint')} testID="register-password" />
      <Check label={t('register.accept')} checked={accepted} onChange={setAccepted} testID="register-accept" />
      <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
        <LinkText label={t('register.rules')} onPress={() => openSite('/chiamarsi/regolamento')} />
        <LinkText label={t('register.privacy')} onPress={() => openSite('/privacy')} />
      </View>
      <Notice kind="error" text={error} />
      <Btn label={t('register.submit')} icon="arrow" onPress={submit} disabled={!valid} loading={busy} testID="register-submit" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <T v="small">{t('common.or')}</T>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
      <Btn label={t('register.haveAccount')} variant="secondary" onPress={() => router.push('/accedi')} testID="go-login" />
      <Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Icon name="check" size={16} color={colors.accent} />
          <T v="small" style={{ flex: 1 }}><T v="small" style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{t('register.noteProsTitle')}</T> {t('register.notePros')}</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Icon name="heart" size={16} color={colors.muted} />
          <T v="small" style={{ flex: 1 }}><T v="small" style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{t('register.notePublicTitle')}</T> {t('register.notePublic')}</T>
        </View>
      </Card>
    </Screen>
  );
}

/** «Hai già un account sul sito? Accedi»: stesse credenziali del sito. */
export function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setPending } = useSession();

  const submit = async () => {
    setBusy(true);
    setError(null);
    const mail = email.trim().toLowerCase();
    const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
    setBusy(false);
    if (!err) return;
    const notConfirmed = (err.code ?? '') === 'email_not_confirmed' || (err.message ?? '').toLowerCase().includes('not confirmed');
    if (notConfirmed) {
      setPending({ email: mail, password });
      return;
    }
    setError(authErrorMessage(err, t));
  };

  return (
    <Screen testID="screen-login">
      <BackHeader eyebrow="Listen" title={t('login.title')} />
      <T v="body">{t('login.intro')}</T>
      <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="username" testID="login-email" />
      <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" testID="login-password" />
      <Notice kind="error" text={error} />
      <Btn label={t('login.submit')} icon="arrow" onPress={submit} disabled={!isEmail(email) || !password} loading={busy} testID="login-submit" />
      <LinkText label={t('login.forgot')} onPress={() => router.push('/password')} />
    </Screen>
  );
}

/** «Password dimenticata»: parte l'email del sito, la password si cambia lì. */
export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setBusy(false);
    if (err) setError(authErrorMessage(err, t));
    else setSent(true);
  };

  return (
    <Screen>
      <BackHeader eyebrow="Listen" title={t('forgot.title')} />
      <T v="body">{t('forgot.intro')}</T>
      <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" />
      <Notice kind="error" text={error} />
      {sent ? <Notice kind="ok" title={t('forgot.sent')} text={t('forgot.sentText')} /> : null}
      <Btn label={t('forgot.submit')} onPress={submit} disabled={!isEmail(email)} loading={busy} />
    </Screen>
  );
}

/** La verifica dell'email è obbligatoria: finché non è fatta l'app si ferma qui. */
export function ConfirmEmailScreen() {
  const { t } = useTranslation();
  const { pending, session, signOut, refreshAll } = useSession();
  const email = pending?.email ?? session?.user.email ?? '';
  const [busy, setBusy] = useState<'check' | 'resend' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const check = async () => {
    setBusy('check');
    setError(null);
    setInfo(null);
    try {
      if (pending) {
        const { error: err } = await supabase.auth.signInWithPassword(pending);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.auth.refreshSession();
        if (err) throw err;
        if (!data.user?.email_confirmed_at) throw { code: 'email_not_confirmed' };
        await refreshAll();
      }
    } catch (e) {
      setError(authErrorMessage(e, t));
    } finally {
      setBusy(null);
    }
  };

  const resend = async () => {
    if (!email) return;
    setBusy('resend');
    setError(null);
    setInfo(null);
    const { error: err } = await supabase.auth.resend({ type: 'signup', email });
    setBusy(null);
    if (err) setError(authErrorMessage(err, t));
    else setInfo(t('confirm.resent'));
  };

  return (
    <Screen testID="screen-confirm-email">
      <LogoHeader />
      <View style={{ gap: 10, marginTop: 8 }}>
        <T v="h1">{t('confirm.title')}</T>
        <T v="body">{t('confirm.intro', { email })}</T>
      </View>
      <Notice kind="error" text={error} />
      <Notice kind="ok" text={info} />
      <Btn label={t('confirm.done')} icon="arrow" onPress={check} loading={busy === 'check'} disabled={busy === 'resend'} testID="confirm-check" />
      <Btn label={t('confirm.resend')} variant="secondary" onPress={resend} loading={busy === 'resend'} disabled={busy === 'check'} testID="confirm-resend" />
      <LinkText label={t('confirm.other')} onPress={() => void signOut()} color={colors.muted} />
    </Screen>
  );
}
