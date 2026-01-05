import { useRef, useEffect, useCallback } from 'react';
import { isIOSDevice } from '../utils/platform';

export function useAudio() {
  const ref = useRef(null); // one-shot SFX
  const loopRef = useRef(null); // BGM loop
  const fadeTimerRef = useRef(null);
  const visHandlerRef = useRef(null);
  const unlockHandlersRef = useRef(null);
  const loopMetaRef = useRef({ src: '', volume: 1 });
  const pendingOnceRef = useRef(null);
  const unlockedRef = useRef(false);

  const setInlineAttrs = (audio) => {
    try {
      // iOS Safari: prevent fullscreen + improve autoplay reliability
      audio.playsInline = true;
      audio.setAttribute?.('playsinline', '');
      audio.setAttribute?.('webkit-playsinline', '');
      audio.preload = 'auto';
    } catch {}
  };

  const cleanupUnlockHandlers = () => {
    const h = unlockHandlersRef.current;
    if (!h) return;
    try {
      window.removeEventListener('touchend', h);
      window.removeEventListener('pointerdown', h);
      window.removeEventListener('click', h);
      window.removeEventListener('keydown', h);
      window.removeEventListener('focus', h);
      window.removeEventListener('pageshow', h);
      document.removeEventListener('visibilitychange', h);
    } catch {}
    unlockHandlersRef.current = null;
  };

  const ensureUnlockHandlers = (fn) => {
    if (unlockHandlersRef.current) return;
    const handler = () => fn?.();
    unlockHandlersRef.current = handler;
    try {
      // Next user gesture typically unlocks audio on iOS
      window.addEventListener('touchend', handler, { passive: true });
      window.addEventListener('pointerdown', handler, { passive: true });
      window.addEventListener('click', handler, { passive: true });
      window.addEventListener('keydown', handler, { passive: true });
      window.addEventListener('focus', handler);
      window.addEventListener('pageshow', handler);
      document.addEventListener('visibilitychange', handler);
    } catch {}
  };

  const tryPlay = (audio, { volume = 1, prime = false } = {}) => {
    try {
      if (!audio) return false;
      setInlineAttrs(audio);
      // iOS: "prime" start (muted) inside a gesture helps unlock reliably
      const isiOS = isIOSDevice();
      if (prime && isiOS && !unlockedRef.current) {
        try {
          audio.muted = true;
          audio.volume = 0;
        } catch {}
      } else {
        try {
          audio.muted = false;
          audio.volume = volume;
        } catch {}
      }
      const p = audio.play?.();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          unlockedRef.current = true;
          // if we primed muted, unmute after it actually starts
          if (prime && isiOS) {
            try {
              audio.muted = false;
              audio.volume = volume;
            } catch {}
          }
        }).catch(() => {});
        return true;
      }
      // Older browsers: play() may be sync and not return a promise
      unlockedRef.current = true;
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    return () => {
      cleanupUnlockHandlers();
      if (ref.current) {
        ref.current.pause();
        ref.current = null;
      }
      if (loopRef.current) {
        loopRef.current.pause();
        loopRef.current = null;
      }
      if (visHandlerRef.current) {
        document.removeEventListener('visibilitychange', visHandlerRef.current);
        window.removeEventListener('focus', visHandlerRef.current);
        visHandlerRef.current = null;
      }
    };
  }, []);

  const resumeLoop = useCallback(() => {
    try {
      if (loopRef.current && loopRef.current.paused) {
        // no prime here; this is usually not in a user gesture
        tryPlay(loopRef.current, { volume: loopMetaRef.current.volume, prime: false });
      }
    } catch {}
  }, []);

  const replayPending = useCallback(() => {
    // try to resume loop
    resumeLoop();
    // try pending once SFX if any
    try {
      if (pendingOnceRef.current) {
        const s = pendingOnceRef.current;
        pendingOnceRef.current = null;
        // attempt play now; if still blocked, it will be re-queued by playOnce
        playOnce(s);
      }
    } catch {}
  }, [resumeLoop]);

  const playOnce = (src) => {
    try {
      if (!src) return;
      stop(true);
      const audio = new Audio(src);
      setInlineAttrs(audio);
      audio.volume = 1;
      ref.current = audio;
      const ok = tryPlay(audio, { volume: 1, prime: false });
      if (!ok) {
        pendingOnceRef.current = src;
        ensureUnlockHandlers(replayPending);
      }
    } catch {}
  };

  const stop = (fade = false) => {
    try {
      if (ref.current) {
        if (fade) {
          try {
            const a = ref.current;
            let v = a.volume;
            if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
            fadeTimerRef.current = setInterval(() => {
              v = Math.max(0, v - 0.1);
              a.volume = v;
              if (v <= 0) {
                clearInterval(fadeTimerRef.current);
                a.pause();
                ref.current = null;
              }
            }, 30);
          } catch {
            ref.current.pause();
            ref.current = null;
          }
        } else {
          ref.current.pause();
          ref.current.currentTime = 0;
          ref.current = null;
        }
      }
    } catch {}
  };

  const playLoop = (src, { volume = 1, prime = false } = {}) => {
    try {
      if (!src) return;
      // reuse the same element to reduce iOS flakiness
      if (!loopRef.current) loopRef.current = new Audio();
      const audio = loopRef.current;
      setInlineAttrs(audio);
      loopMetaRef.current = { src, volume };
      audio.loop = true;
      try {
        // refresh source reliably
        if (audio.src !== src) {
          audio.src = src;
          audio.load?.();
        }
      } catch {}
      try {
        audio.volume = volume;
      } catch {}
      const ensure = () => {
        if (loopRef.current && loopRef.current.paused) {
          tryPlay(loopRef.current, { volume: loopMetaRef.current.volume, prime: false });
        }
      };
      ['pause','stalled','suspend','waiting','ended'].forEach(ev =>
        audio.addEventListener(ev, () => setTimeout(ensure, 50))
      );
      const resume = () => setTimeout(ensure, 50);
      visHandlerRef.current = resume;
      document.addEventListener('visibilitychange', resume);
      window.addEventListener('focus', resume);
      const ok = tryPlay(audio, { volume, prime });
      if (!ok) ensureUnlockHandlers(replayPending);
    } catch {}
  };

  const stopLoop = () => {
    try {
      if (loopRef.current) {
        loopRef.current.pause();
      }
    } catch {}
  };

  return { playOnce, stop, playLoop, stopLoop, resumeLoop };
}


