import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import styles from '../styles/Home.module.css';

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function rmsFromTimeDomain(byteTimeDomain) {
  // byteTimeDomain: 0..255, 128 is zero
  let sum = 0;
  for (let i = 0; i < byteTimeDomain.length; i += 1) {
    const v = (byteTimeDomain[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / byteTimeDomain.length);
}

function spectralCentroidHz(byteFreq, sampleRate) {
  // byteFreq: 0..255 magnitudes, bins 0..N-1 mapped to 0..Nyquist
  const n = byteFreq.length;
  const nyquist = sampleRate / 2;
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const mag = byteFreq[i] / 255;
    total += mag;
    weighted += mag * (i / (n - 1)) * nyquist;
  }
  if (total <= 1e-9) return 0;
  return weighted / total;
}

export default function Mic() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  // UI outputs
  const [mark, setMark] = useState('-'); // 'a' | 'b' | '-'
  const [rms, setRms] = useState(0);
  const [centroid, setCentroid] = useState(0);
  const [deltaHz, setDeltaHz] = useState(0);
  const [lastEventAt, setLastEventAt] = useState(null);

  // Tunables
  const [levelThresh, setLevelThresh] = useState(0.03);
  const [deltaThreshHz, setDeltaThreshHz] = useState(350);
  const [cooldownMs, setCooldownMs] = useState(700);

  // Internals
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const baselineRmsRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const timeDataRef = useRef(null);
  const freqDataRef = useRef(null);
  const centroidEmaRef = useRef(0);
  const eventArmedRef = useRef(true);
  const nextMarkRef = useRef('a'); // a -> b -> a ...
  const lastEventMsRef = useRef(0);

  async function stop() {
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;

      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
      streamRef.current = null;
      mediaSourceRef.current = null;
      analyserRef.current = null;

      if (audioCtxRef.current) {
        await audioCtxRef.current.close();
      }
      audioCtxRef.current = null;
    } finally {
      eventArmedRef.current = true;
      centroidEmaRef.current = 0;
      nextMarkRef.current = 'a';
      lastEventMsRef.current = 0;
      setIsRunning(false);
    }
  }

  async function start() {
    setError('');
    setMark('-');
    setLastEventAt(null);
    setDeltaHz(0);
    eventArmedRef.current = true;
    centroidEmaRef.current = 0;
    nextMarkRef.current = 'a';
    lastEventMsRef.current = 0;

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('이 브라우저에서 마이크(getUserMedia)를 사용할 수 없어요.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.65;

      const src = audioCtx.createMediaStreamSource(stream);
      src.connect(analyser);

      const timeData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      streamRef.current = stream;
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      mediaSourceRef.current = src;
      timeDataRef.current = timeData;
      freqDataRef.current = freqData;

      setIsRunning(true);

      const loop = (t) => {
        const a = analyserRef.current;
        const ctx = audioCtxRef.current;
        const td = timeDataRef.current;
        const fd = freqDataRef.current;
        if (!a || !ctx || !td || !fd) return;

        a.getByteTimeDomainData(td);
        a.getByteFrequencyData(fd);

        const r = rmsFromTimeDomain(td);
        const c = spectralCentroidHz(fd, ctx.sampleRate);

        // Smooth centroid a bit (EMA) so "급변"이 노이즈에 덜 민감
        const alpha = 0.18; // higher => less smoothing
        const prevEma = centroidEmaRef.current || c;
        const ema = prevEma + alpha * (c - prevEma);
        centroidEmaRef.current = ema;
        const d = Math.abs(ema - prevEma);

        // UI throttling (avoid rerender every frame)
        if (t - lastUiUpdateRef.current > 80) {
          lastUiUpdateRef.current = t;
          setRms(r);
          setCentroid(ema);
          setDeltaHz(d);
        }

        // 이벤트 기준:
        // - RMS가 일정 이상(숨소리/노이즈 존재)
        // - 센트로이드가 "갑자기 크게" 변하면 이벤트로 간주
        // - 이벤트가 발생할 때마다 a/b를 번갈아 표시
        const nowMs = performance.now();
        const canFire = nowMs - lastEventMsRef.current >= cooldownMs;
        const armTh = Math.max(deltaThreshHz * 0.6, deltaThreshHz - 80);

        if (d <= armTh) {
          eventArmedRef.current = true;
        }

        if (eventArmedRef.current && canFire && r >= levelThresh && d >= deltaThreshHz) {
          eventArmedRef.current = false;
          lastEventMsRef.current = nowMs;

          const m = nextMarkRef.current;
          setMark(m);
          setLastEventAt(Date.now());
          nextMarkRef.current = m === 'a' ? 'b' : 'a';
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setError(e?.message || '마이크 권한/초기화 중 오류가 발생했어요.');
      await stop();
    }
  }

  async function calibrate() {
    // 2초간 RMS 평균을 잡아 baseline으로 저장 후, 임계값을 자동 제안
    const a = analyserRef.current;
    const ctx = audioCtxRef.current;
    const td = timeDataRef.current;
    if (!a || !ctx || !td) return;

    const startedAt = performance.now();
    let sum = 0;
    let n = 0;
    while (performance.now() - startedAt < 2000) {
      a.getByteTimeDomainData(td);
      sum += rmsFromTimeDomain(td);
      n += 1;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 30));
    }
    const baseline = n ? sum / n : 0;
    baselineRmsRef.current = baseline;

    // 제안값: baseline 대비 3~5배(환경마다 다름)
    const proposed = clamp(baseline * 4, 0.01, 0.25);
    setLevelThresh(proposed);
  }

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Head>
        <title>mic • manpa</title>
        <meta name="description" content="Mic / breath detection test" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Breath Test</h1>
        <p className={styles.subtitle}>
          들숨 시작 인식 → <b>a</b>, 날숨 시작 인식 → <b>b</b>
        </p>

        <div className={styles.bigMark} data-mark={mark}>
          {mark}
        </div>

        <div className={styles.controls}>
          {!isRunning ? (
            <button className={styles.button} onClick={start}>
              Start Mic
            </button>
          ) : (
            <>
              <button className={styles.button} onClick={stop}>
                Stop
              </button>
              <button className={styles.buttonSecondary} onClick={calibrate} title="조용히 있는 상태로 2초 캘리브레이션">
                Calibrate (2s)
              </button>
            </>
          )}
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.panel}>
          <div className={styles.row}>
            <div className={styles.k}>RMS(level)</div>
            <div className={styles.v}>{rms.toFixed(4)}</div>
          </div>
          <div className={styles.row}>
            <div className={styles.k}>Centroid</div>
            <div className={styles.v}>{Math.round(centroid)} Hz</div>
          </div>
          <div className={styles.row}>
            <div className={styles.k}>ΔHz (jump)</div>
            <div className={styles.v}>{Math.round(deltaHz)} Hz</div>
          </div>
          <div className={styles.row}>
            <div className={styles.k}>Threshold</div>
            <div className={styles.v}>{levelThresh.toFixed(3)}</div>
          </div>
          <div className={styles.row}>
            <div className={styles.k}>Δ threshold</div>
            <div className={styles.v}>{Math.round(deltaThreshHz)} Hz</div>
          </div>
          <div className={styles.row}>
            <div className={styles.k}>Cooldown</div>
            <div className={styles.v}>{Math.round(cooldownMs)} ms</div>
          </div>
          <div className={styles.row}>
            <div className={styles.k}>Last event</div>
            <div className={styles.v}>{lastEventAt ? new Date(lastEventAt).toLocaleTimeString() : '-'}</div>
          </div>
        </div>

        <div className={styles.tuners}>
          <label className={styles.tuner}>
            <span>Level threshold</span>
            <input
              type="range"
              min="0.005"
              max="0.25"
              step="0.001"
              value={levelThresh}
              onChange={(e) => setLevelThresh(Number(e.target.value))}
            />
          </label>

          <label className={styles.tuner}>
            <span>Δ threshold (Hz)</span>
            <input
              type="range"
              min="50"
              max="1500"
              step="10"
              value={deltaThreshHz}
              onChange={(e) => setDeltaThreshHz(Number(e.target.value))}
            />
          </label>

          <label className={styles.tuner}>
            <span>Cooldown (ms)</span>
            <input
              type="range"
              min="200"
              max="2000"
              step="50"
              value={cooldownMs}
              onChange={(e) => setCooldownMs(Number(e.target.value))}
            />
          </label>
        </div>

        <p className={styles.hint}>
          팁: 먼저 <b>Start Mic</b> → 조용히 <b>Calibrate</b> → 그 다음 들숨/날숨을 크게 내보면서
          <b> a/b</b>가 번갈아 뜨는지 확인해보세요. 너무 자주 바뀌면 Δ threshold나 Cooldown을 올리면 됩니다.
        </p>
      </main>
    </>
  );
}


