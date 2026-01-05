import { useEffect, useRef } from 'react';
import { isIOSDevice } from '../utils/platform';

// Simple breath detector based on RMS energy with hysteresis and throttle.
export function useBreathDetector(onBreath, opts = {}) {
  const isiOS = isIOSDevice();
  const thresholdDelta = typeof opts.thresholdDelta === 'number' ? opts.thresholdDelta : 0.18; // stricter by default
  const absMinRms = typeof opts.absMinRms === 'number' ? opts.absMinRms : (isiOS ? 0.02 : 0.06); // iOS mics often lower RMS
  const cooldownMs = typeof opts.cooldownMs === 'number' ? opts.cooldownMs : 1800;
  const holdFrames = typeof opts.holdFrames === 'number' ? opts.holdFrames : (isiOS ? 18 : 24); // require sustained exhale
  const armAfterMs = typeof opts.armAfterMs === 'number' ? opts.armAfterMs : 500; // ignore first N ms (stabilize)
  const ctxRef = useRef(null);
  const srcRef = useRef(null);
  const anaRef = useRef(null);
  const rafRef = useRef(null);
  const lastTriggerRef = useRef(0);
  const baselineRef = useRef(0.01);
  const overFramesRef = useRef(0);
  const armedAtRef = useRef(0);

  const handlersRef = useRef([]);
  useEffect(() => {
    let stream;
    let mounted = true;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        });
        if (!mounted) return;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctxRef.current = ctx;
        // iOS/Safari: ensure AudioContext is resumed on first gesture/visibility
        if (isiOS) {
          const unlock = () => {
            try {
              if (ctxRef.current && ctxRef.current.state !== 'running') {
                ctxRef.current.resume().catch(() => {});
              }
            } catch {}
          };
          const onVisibility = () => {
            if (!document.hidden) unlock();
          };
          const add = (target, type, fn, opts) => {
            target.addEventListener(type, fn, opts);
            handlersRef.current.push({ target, type, fn, opts });
          };
          add(window, 'touchend', unlock, { passive: true });
          add(window, 'pointerdown', unlock, { passive: true });
          add(window, 'click', unlock, { passive: true });
          add(window, 'keydown', unlock, { passive: true });
          add(document, 'visibilitychange', onVisibility);
          add(window, 'focus', unlock);
        }
        armedAtRef.current = performance.now() + armAfterMs;
        const src = ctx.createMediaStreamSource(stream);
        srcRef.current = src;
        const ana = ctx.createAnalyser();
        ana.fftSize = 1024;
        ana.smoothingTimeConstant = 0.7;
        src.connect(ana);
        anaRef.current = ana;

        const data = new Uint8Array(ana.frequencyBinCount);
        const loop = () => {
          ana.getByteTimeDomainData(data);
          // RMS in 0..1
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          // update baseline slowly
          baselineRef.current = baselineRef.current * 0.995 + rms * 0.005;
          const threshold = baselineRef.current + thresholdDelta; // adjustable sensitivity
          const now = performance.now();
          // Ignore until armed
          if (now < armedAtRef.current) {
            overFramesRef.current = 0;
            rafRef.current = requestAnimationFrame(loop);
            return;
          }
          if (rms > threshold && rms > absMinRms) {
            overFramesRef.current += 1;
          } else {
            overFramesRef.current = 0;
          }
          // require sustained frames above threshold
          if (overFramesRef.current >= holdFrames && now - lastTriggerRef.current > cooldownMs) {
            lastTriggerRef.current = now;
            overFramesRef.current = 0;
            onBreath?.();
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        // if no mic, skip silently
      }
    })();
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (ctxRef.current) ctxRef.current.close();
      // remove all registered handlers
      handlersRef.current.forEach(({ target, type, fn, opts }) => {
        try { target.removeEventListener(type, fn, opts); } catch {}
      });
      handlersRef.current = [];
      if (srcRef.current) {
        try {
          const tracks = srcRef.current.mediaStream?.getTracks?.() || [];
          tracks.forEach(t => t.stop());
        } catch {}
      }
      ctxRef.current = null;
      srcRef.current = null;
      anaRef.current = null;
    };
  }, [onBreath]);
}


