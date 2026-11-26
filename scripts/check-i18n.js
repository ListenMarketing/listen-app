/* Controlla che it.json ed en.json abbiano le stesse chiavi e che ogni chiave usata nel codice esista. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
const it = flat(require(path.join(root, 'i18n', 'it.json')));
const en = flat(require(path.join(root, 'i18n', 'en.json')));
const base = (k) => k.replace(/_(one|other|zero|many|few)$/, '');

const errors = [];
for (const k of it) if (!en.includes(k)) errors.push(`manca in en.json: ${k}`);
for (const k of en) if (!it.includes(k)) errors.push(`manca in it.json: ${k}`);

const known = new Set(it.map(base));
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(f.name) && !full.includes('__tests__')) files.push(full);
  }
})(root);

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*['`]([^'`]+)['`]/g)) {
    const key = m[1];
    if (key.includes('${')) {
      const prefix = key.slice(0, key.indexOf('${'));
      if (![...known].some((k) => k.startsWith(prefix))) errors.push(`${path.relative(root, file)}: nessuna chiave comincia con «${prefix}»`);
    } else if (!known.has(key)) errors.push(`${path.relative(root, file)}: chiave mancante «${key}»`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`i18n ok: ${it.length} chiavi in italiano e in inglese, ${files.length} file controllati`);
