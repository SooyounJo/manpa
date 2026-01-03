import { useRef, useEffect } from 'react';

export function useAudio() {
  const ref = useRef(null);
  const loopRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const visHandlerRef = useRef(null);

  useEffect(() => {
    return () => {
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

  const playOnce = (src) => {
    try {
      if (!src) return;
      stop(true);
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 1;
      ref.current = audio;
      audio.play().catch(() => {});
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

  const playLoop = (src, { volume = 1 } = {}) => {
    try {
      if (!src) return;
      stopLoop();
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.loop = true;
      audio.volume = volume;
      loopRef.current = audio;
      const ensure = () => {
        if (loopRef.current && loopRef.current.paused) {
          loopRef.current.play().catch(() => {});
        }
      };
      ['pause','stalled','suspend','waiting','ended'].forEach(ev =>
        audio.addEventListener(ev, () => setTimeout(ensure, 50))
      );
      const resume = () => setTimeout(ensure, 50);
      visHandlerRef.current = resume;
      document.addEventListener('visibilitychange', resume);
      window.addEventListener('focus', resume);
      audio.play().catch(() => {});
    } catch {}
  };

  const stopLoop = () => {
    try {
      if (loopRef.current) {
        loopRef.current.pause();
        loopRef.current = null;
      }
    } catch {}
  };

  const resumeLoop = () => {
    try {
      if (loopRef.current && loopRef.current.paused) {
        loopRef.current.play().catch(() => {});
      }
    } catch {}
  };

  return { playOnce, stop, playLoop, stopLoop, resumeLoop };
}


