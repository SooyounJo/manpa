import { useEffect } from 'react';
import { isIOSDevice } from '../utils/platform';

// Shared (singleton) audio engine across the whole app.
// This fixes iOS issues where different components create different Audio elements that are not "unlocked".
const shared = {
  // HTMLAudio fallback
  loopEl: null,
  sfxEl: null,

  // WebAudio (preferred on iOS for reliable resume + smoother looping)
  ctx: null,
  loopGain: null,
  sfxGain: null,
  loopSource: null,
  loopMeta: { src: '', volume: 1 },

  buffers: new Map(), // src -> Promise<AudioBuffer>
  unlocked: false,
  unlockHandler: null,
  visHandler: null,
  refCount: 0,
};

function setInlineAttrs(audio) {
  try {
    audio.playsInline = true;
    audio.setAttribute?.('playsinline', '');
    audio.setAttribute?.('webkit-playsinline', '');
    audio.preload = 'auto';
  } catch {}
}

function ensureCtx() {
  if (typeof window === 'undefined') return null;
  if (shared.ctx) return shared.ctx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    shared.ctx = ctx;
    shared.loopGain = ctx.createGain();
    shared.sfxGain = ctx.createGain();
    shared.loopGain.connect(ctx.destination);
    shared.sfxGain.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

async function loadBuffer(src) {
  if (!src) return null;
  if (shared.buffers.has(src)) return shared.buffers.get(src);
  const p = (async () => {
    try {
      const ctx = ensureCtx();
      if (!ctx) return null;
      const res = await fetch(src);
      const buf = await res.arrayBuffer();
      return await ctx.decodeAudioData(buf);
    } catch {
      return null;
    }
  })();
  shared.buffers.set(src, p);
  return p;
}

function installUnlockHandlers(fn) {
  if (shared.unlockHandler || typeof window === 'undefined') return;
  const handler = () => fn?.();
  shared.unlockHandler = handler;
  try {
    window.addEventListener('touchend', handler, { passive: true });
    window.addEventListener('pointerdown', handler, { passive: true });
    window.addEventListener('click', handler, { passive: true });
    window.addEventListener('keydown', handler, { passive: true });
    window.addEventListener('focus', handler);
    window.addEventListener('pageshow', handler);
    document.addEventListener('visibilitychange', handler);
  } catch {}
}

function removeUnlockHandlers() {
  const h = shared.unlockHandler;
  if (!h || typeof window === 'undefined') return;
  try {
    window.removeEventListener('touchend', h);
    window.removeEventListener('pointerdown', h);
    window.removeEventListener('click', h);
    window.removeEventListener('keydown', h);
    window.removeEventListener('focus', h);
    window.removeEventListener('pageshow', h);
    document.removeEventListener('visibilitychange', h);
  } catch {}
  shared.unlockHandler = null;
}

async function resumeCtx() {
  try {
    const ctx = ensureCtx();
    if (!ctx) return false;
    if (ctx.state !== 'running') await ctx.resume();
    shared.unlocked = true;
    return true;
  } catch {
    return false;
  }
}

function stopLoopWeb() {
  try {
    if (shared.loopSource) {
      try { shared.loopSource.stop(0); } catch {}
      try { shared.loopSource.disconnect(); } catch {}
      shared.loopSource = null;
    }
  } catch {}
}

async function playLoopWeb(src, volume = 1, prime = false) {
  const ctx = ensureCtx();
  if (!ctx) return false;
  shared.loopMeta = { src, volume };
  shared.loopGain.gain.value = volume;
  if (prime) await resumeCtx();
  const buf = await loadBuffer(src);
  if (!buf) return false;
  // Already playing same source
  if (shared.loopSource) return true;
  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  // reduce audible gap on some decoders (avoid looping the very last padding)
  try {
    source.loopStart = 0;
    source.loopEnd = Math.max(0.01, buf.duration - 0.03);
  } catch {}
  source.connect(shared.loopGain);
  source.start(0);
  shared.loopSource = source;
  return true;
}

function ensureLoopResumeHandlers() {
  if (shared.visHandler || typeof window === 'undefined') return;
  const handler = () => {
    // resume context & restart loop if it was stopped
    resumeCtx().finally(() => {
      if (shared.loopMeta?.src) {
        playLoop(shared.loopMeta.src, { volume: shared.loopMeta.volume }).catch(() => {});
      }
    });
  };
  shared.visHandler = handler;
  try {
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);
    window.addEventListener('pageshow', handler);
  } catch {}
}

function removeLoopResumeHandlers() {
  const h = shared.visHandler;
  if (!h || typeof window === 'undefined') return;
  try {
    document.removeEventListener('visibilitychange', h);
    window.removeEventListener('focus', h);
    window.removeEventListener('pageshow', h);
  } catch {}
  shared.visHandler = null;
}

async function playOnceWeb(src, volume = 1, prime = false) {
  const ctx = ensureCtx();
  if (!ctx) return false;
  if (prime) await resumeCtx();
  const buf = await loadBuffer(src);
  if (!buf) return false;
  try {
    shared.sfxGain.gain.value = volume;
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(shared.sfxGain);
    source.start(0);
    return true;
  } catch {
    return false;
  }
}

function playLoopHtml(src, { volume = 1, prime = false } = {}) {
  try {
    if (!shared.loopEl) shared.loopEl = new Audio();
    const a = shared.loopEl;
    setInlineAttrs(a);
    a.loop = true;
    a.volume = volume;
    if (a.src !== src) {
      a.src = src;
      a.load?.();
    }
    if (prime && isIOSDevice() && !shared.unlocked) {
      a.muted = true;
      a.volume = 0;
    } else {
      a.muted = false;
    }
    const p = a.play?.();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        shared.unlocked = true;
        if (prime && isIOSDevice()) {
          a.muted = false;
          a.volume = volume;
        }
      }).catch(() => {});
    }
  } catch {}
}

function playOnceHtml(src) {
  try {
    if (!shared.sfxEl) shared.sfxEl = new Audio();
    const a = shared.sfxEl;
    setInlineAttrs(a);
    a.src = src;
    a.volume = 1;
    a.currentTime = 0;
    a.play?.().catch?.(() => {});
  } catch {}
}

export function useAudio() {
  useEffect(() => {
    shared.refCount += 1;
    ensureLoopResumeHandlers();
    return () => {
      shared.refCount -= 1;
      if (shared.refCount <= 0) {
        // no consumers: cleanup listeners, but keep buffers cached (safe)
        removeUnlockHandlers();
        removeLoopResumeHandlers();
      }
    };
  }, []);

  const playLoop = async (src, { volume = 1, prime = false } = {}) => {
    if (!src) return;
    // Use WebAudio on iOS (and generally when available) for better reliability and smoother loops.
    const preferWeb = !!ensureCtx();
    if (preferWeb) {
      const ok = await playLoopWeb(src, volume, prime);
      if (!ok) playLoopHtml(src, { volume, prime });
    } else {
      playLoopHtml(src, { volume, prime });
    }
    installUnlockHandlers(() => {
      resumeCtx().finally(() => {
        if (shared.loopMeta?.src) playLoop(shared.loopMeta.src, { volume: shared.loopMeta.volume }).catch(() => {});
      });
    });
  };

  const stopLoop = () => {
    stopLoopWeb();
    try {
      if (shared.loopEl) shared.loopEl.pause();
    } catch {}
  };

  const resumeLoop = () => {
    resumeCtx().finally(() => {
      if (shared.loopMeta?.src) {
        playLoop(shared.loopMeta.src, { volume: shared.loopMeta.volume }).catch(() => {});
      }
    });
  };

  const playOnce = async (src) => {
    if (!src) return;
    const preferWeb = !!ensureCtx();
    if (preferWeb) {
      const ok = await playOnceWeb(src, 1, false);
      if (!ok) playOnceHtml(src);
    } else {
      playOnceHtml(src);
    }
    installUnlockHandlers(() => {
      resumeCtx().catch(() => {});
    });
  };

  // kept for compatibility
  const stop = () => {};

  return { playOnce, stop, playLoop, stopLoop, resumeLoop };
}


