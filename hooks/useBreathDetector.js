import { useEffect, useRef } from 'react';

// Simple breath detector based on RMS energy with hysteresis and throttle.
export function useBreathDetector(onBreath, opts = {}) {
  const thresholdDelta = typeof opts.thresholdDelta === 'number' ? opts.thresholdDelta : 0.18; // stricter by default
  const absMinRms = typeof opts.absMinRms === 'number' ? opts.absMinRms : 0.06; // absolute floor to reject noise
  const cooldownMs = typeof opts.cooldownMs === 'number' ? opts.cooldownMs : 1800;
  const ctxRef = useRef(null);
  const srcRef = useRef(null);
  const anaRef = useRef(null);
  const rafRef = useRef(null);
  const lastTriggerRef = useRef(0);
  const baselineRef = useRef(0.01);
  const overFramesRef = useRef(0);

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
          if (rms > threshold && rms > absMinRms) {
            overFramesRef.current += 1;
          } else {
            overFramesRef.current = 0;
          }
          // require ~200ms over-threshold to trigger (assuming ~60fps)
          if (overFramesRef.current >= 12 && now - lastTriggerRef.current > cooldownMs) {
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


