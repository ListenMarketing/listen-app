import { validateBeatFile, validateCover, validateWav } from '@/lib/validation';

const MB = 1024 * 1024;

describe('controllo del file del beat prima dell’invio', () => {
  it('accetta un WAV di 28 secondi', () => {
    expect(validateBeatFile({ name: 'beat.wav', size: 5 * MB, durationSeconds: 28 })).toEqual({ ok: true });
  });

  it('accetta un MP3 di 30 secondi esatti', () => {
    expect(validateBeatFile({ name: 'beat.MP3', size: 1 * MB, durationSeconds: 30 })).toEqual({ ok: true });
  });

  it('rifiuta un beat di 41 secondi', () => {
    expect(validateBeatFile({ name: 'beat.wav', size: 5 * MB, durationSeconds: 41 })).toEqual({ ok: false, reason: 'duration' });
  });

  it('rifiuta un file oltre i 25 MB', () => {
    expect(validateBeatFile({ name: 'beat.wav', size: 26 * MB, durationSeconds: 20 })).toEqual({ ok: false, reason: 'size' });
  });

  it('rifiuta i formati diversi da WAV e MP3', () => {
    expect(validateBeatFile({ name: 'beat.ogg', mimeType: 'audio/ogg', size: MB, durationSeconds: 20 })).toEqual({ ok: false, reason: 'format' });
  });

  it('usa i limiti che arrivano dal server, se ci sono', () => {
    expect(validateBeatFile({ name: 'beat.wav', size: MB, durationSeconds: 28 }, { maxSeconds: 20, maxBytes: 25 * MB })).toEqual({ ok: false, reason: 'duration' });
  });

  it('se la durata non si riesce a leggere lascia decidere il server', () => {
    expect(validateBeatFile({ name: 'beat.wav', size: MB, durationSeconds: null })).toEqual({ ok: true });
  });
});

describe('copertina e WAV del brano', () => {
  it('accetta solo 3000×3000', () => {
    expect(validateCover({ width: 3000, height: 3000, mimeType: 'image/jpeg' })).toEqual({ ok: true });
    expect(validateCover({ width: 1500, height: 1500, mimeType: 'image/jpeg' })).toEqual({ ok: false, reason: 'cover_size' });
    expect(validateCover({ width: 3000, height: 2999, name: 'c.png' })).toEqual({ ok: false, reason: 'cover_size' });
  });

  it('accetta solo JPG e PNG', () => {
    expect(validateCover({ width: 3000, height: 3000, mimeType: 'image/heic', name: 'c.heic' })).toEqual({ ok: false, reason: 'cover_format' });
  });

  it('il brano deve essere un WAV', () => {
    expect(validateWav({ name: 'brano.wav' }).ok).toBe(true);
    expect(validateWav({ name: 'brano.mp3', mimeType: 'audio/mpeg' }).ok).toBe(false);
  });
});
