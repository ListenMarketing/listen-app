import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/** Le anteprime durano al massimo 30 secondi: oltre, la riproduzione si ferma. */
export const PREVIEW_SECONDS = 30;

type Ctx = {
  playingId: string | null;
  position: number;
  toggle: (id: string, url: string | null) => void;
  stop: () => void;
};

const PlayerContext = createContext<Ctx>({ playingId: null, position: 0, toggle: () => {}, stop: () => {} });

/** Un solo lettore per tutta l'app: parte un'anteprima, si ferma quella di prima. */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const idRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    try {
      playerRef.current?.pause();
    } catch {}
    idRef.current = null;
    setPlayingId(null);
    setPosition(0);
  }, []);

  const ensurePlayer = useCallback(() => {
    if (playerRef.current) return playerRef.current;
    const p = createAudioPlayer(null, { updateInterval: 500 });
    p.addListener('playbackStatusUpdate', (s: AudioStatus) => {
      if (!idRef.current) return;
      setPosition(s.currentTime ?? 0);
      if (s.didJustFinish || (s.currentTime ?? 0) >= PREVIEW_SECONDS) stop();
    });
    playerRef.current = p;
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    return p;
  }, [stop]);

  const toggle = useCallback(
    (id: string, url: string | null) => {
      if (!url) return;
      if (idRef.current === id) {
        stop();
        return;
      }
      try {
        const p = ensurePlayer();
        p.replace({ uri: url });
        p.play();
        idRef.current = id;
        setPlayingId(id);
        setPosition(0);
      } catch {
        stop();
      }
    },
    [ensurePlayer, stop],
  );

  useEffect(
    () => () => {
      try {
        playerRef.current?.remove();
      } catch {}
      playerRef.current = null;
    },
    [],
  );

  const value = useMemo(() => ({ playingId, position, toggle, stop }), [playingId, position, toggle, stop]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => useContext(PlayerContext);

/** Durata di un file audio scelto dal telefono, in secondi (null se non si riesce a leggerla). */
export function getAudioDuration(uri: string, timeoutMs = 8000): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false;
    let player: AudioPlayer | null = null;
    const finish = (v: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        player?.remove();
      } catch {}
      resolve(v);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    try {
      player = createAudioPlayer({ uri }, { updateInterval: 200 });
      const check = (s: AudioStatus) => {
        if (s.isLoaded && s.duration > 0) finish(s.duration);
      };
      player.addListener('playbackStatusUpdate', check);
      if (player.isLoaded && player.duration > 0) finish(player.duration);
    } catch {
      finish(null);
    }
  });
}
