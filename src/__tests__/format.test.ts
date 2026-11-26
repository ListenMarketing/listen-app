import { cleanCode, compareVersions, countdownParts, formatCode, isCompleteCode, needsUpdate, normalizeInstagram } from '@/lib/format';

describe('formattazione del codice di iscrizione', () => {
  it('mette i trattini da solo mentre si scrive', () => {
    expect(formatCode('lm27')).toBe('LM27');
    expect(formatCode('lm27k')).toBe('LM27-K');
    expect(formatCode('LM27K7Q49XTR2BHVM8')).toBe('LM27-K7Q4-9XTR-2BHV-M8');
  });

  it('accetta il codice incollato con trattini, spazi e minuscole', () => {
    expect(formatCode(' lm27-k7q4 9xtr-2bhv-m8 ')).toBe('LM27-K7Q4-9XTR-2BHV-M8');
  });

  it('toglie i caratteri che non esistono nei codici (0, O, 1, I)', () => {
    expect(cleanCode('LM27-0O1I-K7Q4')).toBe('LM27K7Q4');
  });

  it('non va oltre i 18 caratteri', () => {
    expect(cleanCode('LM27K7Q49XTR2BHVM8ZZZZ')).toHaveLength(18);
    expect(formatCode('LM27K7Q49XTR2BHVM8ZZZZ')).toBe('LM27-K7Q4-9XTR-2BHV-M8');
  });

  it('dice quando il codice è completo', () => {
    expect(isCompleteCode('LM27-K7Q4-9XTR-2BHV-M')).toBe(false);
    expect(isCompleteCode('LM27-K7Q4-9XTR-2BHV-M8')).toBe(true);
  });
});

describe('versione minima', () => {
  it('confronta le versioni numero per numero', () => {
    expect(compareVersions('1.2.0', '1.10.0')).toBe(-1);
    expect(compareVersions('2.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.0.0', '1.0')).toBe(0);
  });

  it('chiede l’aggiornamento solo se la minima è più alta di quella installata', () => {
    expect(needsUpdate('1.0.0', '1.0.1')).toBe(true);
    expect(needsUpdate('1.0.1', '1.0.1')).toBe(false);
    expect(needsUpdate('1.2.0', null)).toBe(false);
  });
});

describe('countdown', () => {
  it('scompone il tempo che manca', () => {
    const now = Date.UTC(2027, 0, 1, 0, 0, 0);
    const target = now + ((12 * 24 + 8) * 3600 + 41 * 60 + 7) * 1000;
    expect(countdownParts(target, now)).toEqual({ days: 12, hours: 8, minutes: 41, seconds: 7, done: false });
  });

  it('non va sotto zero e non inventa una data', () => {
    expect(countdownParts(1000, 5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
    expect(countdownParts(null)).toBeNull();
    expect(countdownParts('non una data')).toBeNull();
  });
});

it('normalizza il tag Instagram', () => {
  expect(normalizeInstagram('kiddama')).toBe('@kiddama');
  expect(normalizeInstagram('https://www.instagram.com/kiddama/?hl=it')).toBe('@kiddama');
  expect(normalizeInstagram('  ')).toBe('');
});
