import type { TFunction } from 'i18next';

/** I messaggi di Supabase Auth arrivano in inglese: i più comuni si traducono, gli altri si mostrano così. */
export function authErrorMessage(e: unknown, t: TFunction): string {
  const raw = (e as { message?: string; code?: string } | null) ?? {};
  const msg = (raw.message ?? '').toLowerCase();
  const code = (raw.code ?? '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return t('auth.errors.invalid');
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return t('auth.errors.notConfirmed');
  if (code === 'user_already_exists' || msg.includes('already registered')) return t('auth.errors.exists');
  if (code === 'weak_password' || msg.includes('password should')) return t('auth.errors.weak');
  if (code.includes('rate_limit') || msg.includes('rate limit') || msg.includes('security purposes')) return t('auth.errors.rate');
  if (msg.includes('network') || msg.includes('fetch')) return t('common.needNetwork');
  return raw.message || t('common.genericError');
}
