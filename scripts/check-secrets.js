/*
 * Nel repository dell'app stanno solo l'URL del progetto Supabase e la chiave anon.
 * Questo controllo blocca chiavi segrete, service role, chiavi Stripe e SDK di tracciamento.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', '.expo', 'dist', 'coverage', 'ios', 'android']);
const SELF = path.join('scripts', 'check-secrets.js');

const FORBIDDEN = [
  [/service_role/i, 'service role di Supabase'],
  [/\bsk_(live|test)_[A-Za-z0-9]{8,}/, 'chiave segreta Stripe'],
  [/\brk_(live|test)_[A-Za-z0-9]{8,}/, 'chiave ristretta Stripe'],
  [/\bwhsec_[A-Za-z0-9]{8,}/, 'segreto del webhook Stripe'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'chiave privata'],
  [/\bre_[A-Za-z0-9]{20,}/, 'chiave Resend'],
];

// Nessun SDK di tracciamento o pubblicità di terzi, nessuna API di Spotify, Instagram o TikTok.
const FORBIDDEN_DEPS = [/firebase/i, /analytics/i, /facebook|fbsdk/i, /adjust/i, /appsflyer/i, /amplitude/i, /mixpanel/i, /segment/i, /sentry/i, /admob|google-mobile-ads/i, /branch/i, /spotify/i, /tiktok/i, /react-native-iap|expo-in-app-purchases/i];

const errors = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(f.name)) continue;
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|json|md|yml|yaml|env|example)$/.test(f.name) || f.name.startsWith('.env')) {
      const rel = path.relative(root, full);
      if (rel === SELF || rel === 'package-lock.json') continue;
      const src = fs.readFileSync(full, 'utf8');
      for (const [re, what] of FORBIDDEN) if (re.test(src)) errors.push(`${rel}: sembra contenere ${what}`);
      // un JWT di Supabase con ruolo diverso da anon
      for (const m of src.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
        try {
          const payload = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
          if (payload.role && payload.role !== 'anon') errors.push(`${rel}: JWT con ruolo «${payload.role}» (ammessa solo la chiave anon)`);
        } catch {}
      }
    }
  }
})(root);

const pkg = require(path.join(root, 'package.json'));
for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (FORBIDDEN_DEPS.some((re) => re.test(dep))) errors.push(`package.json: dipendenza non ammessa «${dep}»`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('nessuna chiave segreta e nessun SDK di tracciamento nel repository');
