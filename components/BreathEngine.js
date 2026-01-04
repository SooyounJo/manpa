import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { narrativeBeats } from '../data/narrative';
import { useAudio } from '../hooks/useAudio';
import { useBreathDetector } from '../hooks/useBreathDetector';
import styles from '../styles/Index.module.css';

export default function BreathEngine({
  onBgColor,
  onFirstBeat,
  onFinal,
  onSectionChange,
  stageColorDefault = '#DBE7EA',
}) {
  const beats = useMemo(() => narrativeBeats.filter(b => !b.hidden), []);
  const [idx, setIdx] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const timers = useRef([]);
  const [countdown, setCountdown] = useState(0);
  const [showCountdown, setShowCountdown] = useState(true);
  const countdownRef = useRef(null);
  const [breathGlow, setBreathGlow] = useState(false);
  const [promptBlink, setPromptBlink] = useState(true);
  const [promptOpacity, setPromptOpacity] = useState(1);
  const [promptLabel, setPromptLabel] = useState('숨을 불어넣기');
  const { playOnce, stop } = useAudio();
  const scheduledNextRef = useRef(null);
  const exhaleLockedRef = useRef(false);
  const [showSeconds, setShowSeconds] = useState(false);
  const [started, setStarted] = useState(false);
  const [isPausing, setIsPausing] = useState(false);

  // Helpers
  const clearTimers = () => {
    timers.current.forEach(t => clearTimeout(t));
    timers.current = [];
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (scheduledNextRef.current) {
      clearTimeout(scheduledNextRef.current);
      scheduledNextRef.current = null;
    }
  };

  const current = beats[idx] || {};

  const startCountdownCycle = useCallback((durationsSec = [4, 4], labels = ['숨을 불어넣기', '숨을 들이쉬기'], onDone) => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    let phaseIndex = 0;
    let remaining = durationsSec[phaseIndex];
    setShowCountdown(true);
    setPromptLabel(labels[phaseIndex] || '숨을 불어넣기');
    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        phaseIndex += 1;
        if (phaseIndex >= durationsSec.length) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          setCountdown(0);
          if (onDone) onDone();
          return;
        }
        remaining = durationsSec[phaseIndex];
        setPromptLabel(labels[phaseIndex] || '숨을 불어넣기');
      }
      setCountdown(remaining);
    }, 1000);
  }, []);

  // Step handler
  const startBeat = useCallback((i) => {
    clearTimers();
    const b = beats[i];
    if (!b) return;
    // notify section/chapter change (use numeric prefix if available)
    if (b?.id) {
      const m = String(b.id).match(/^(\d+)/);
      if (m && onSectionChange) {
        onSectionChange(m[1]);
      }
    }
    // background color: only change if script provides a color (persist otherwise)
    if (b.bgColor) onBgColor?.(b.bgColor);
    // audio: play immediately only for non-exhale beats; exhale SFX starts on exhale trigger
    if (b.audio && b.trigger !== 'exhale') playOnce(`/music/${b.audio}`);
    // lines
    setLineIdx(0);
    if ((b.lines?.length || 0) > 1) {
      timers.current.push(setTimeout(() => setLineIdx(1), b.lineMs || 3000));
    }
    // show capsule in waiting state (exhale waits for trigger, inhale auto-runs)
    setShowCountdown(true);
    setPromptLabel(b.trigger === 'exhale' ? '숨을 불어넣기' : (b.trigger === 'pause' ? '멈춤' : '숨을 들이쉬기'));
    setCountdown(0);
    setPromptBlink(b.trigger === 'exhale');
    setPromptOpacity(1);
    exhaleLockedRef.current = b.trigger !== 'exhale';
    setShowSeconds(b.trigger === 'exhale' || b.trigger === 'pause');
    // interlude advance automatically when debug not used
    const totalMs =
      ((b.lines?.length || 0) * (b.lineMs || 3000)) + (b.interludeMs || 0);
    // For inhale/none triggers, auto-advance after duration with countdown
    if (b.trigger === 'pause') {
      // hide capsule entirely during pause, show centered '멈춤' text
      setShowCountdown(false);
      setIsPausing(true);
      const totalMsPause = Math.max(b.interludeMs || 7000, 7000);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      scheduledNextRef.current = setTimeout(() => {
        setIsPausing(false);
        const lastId = (beats[beats.length - 1] || {}).id;
        if (b.id === lastId) {
          onFinal?.();
          return;
        }
        const n = Math.min(i + 1, beats.length - 1);
        setIdx(n);
        startBeat(n);
      }, totalMsPause);
      return;
    }
    if (b.trigger !== 'exhale' && totalMs > 0) {
      setCountdown(Math.ceil(totalMs / 1000));
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      exhaleLockedRef.current = true;
      scheduledNextRef.current = setTimeout(() => {
        const lastId = (beats[beats.length - 1] || {}).id;
        const isFinal = b.id === lastId;
        if (isFinal) {
          onFinal?.();
          return;
        }
        const n = Math.min(i + 1, beats.length - 1);
        setIdx(n);
        startBeat(n);
      }, totalMs);
    }
  }, [beats, onBgColor, playOnce, stop, stageColorDefault]);

  // init: auto-start on first inhale beat
  useEffect(() => {
    // start immediately on mount (inhale beats auto-run)
    setStarted(true);
    startBeat(0);
    onFirstBeat?.();
    // keyboard shortcuts
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimers();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = useCallback(() => {
    const n = Math.min(idx + 1, beats.length - 1);
    setIdx(n);
    startBeat(n);
  }, [idx, beats.length, startBeat]);

  const prev = useCallback(() => {
    const p = Math.max(idx - 1, 0);
    setIdx(p);
    startBeat(p);
  }, [idx, startBeat]);

  const lineA = current.lines?.[0] || '';
  const lineB = current.lines?.[1] || '';

  // Breath control: strong exhale -> graceful advance
  useBreathDetector(() => {
    // If not started yet, first exhale begins the narrative
    if (!started) {
      setStarted(true);
      onFirstBeat?.();
      startBeat(0);
      return;
    }
    const b = beats[idx] || {};
    if (b.trigger !== 'exhale') return; // only exhale beats respond
    if (exhaleLockedRef.current) return;
    setBreathGlow(true);
    setTimeout(() => setBreathGlow(false), 700);
    setPromptBlink(false);
    // play exhale SFX exactly at trigger time (if provided)
    if (b.audio) playOnce(`/music/${b.audio}`);
    exhaleLockedRef.current = true;
    // compute total display time and show countdown in label
    // Exhale countdown: 8 seconds (use interludeMs if longer)
    const totalMs = Math.max(b.interludeMs != null ? b.interludeMs : 8000, 8000);
    const secs = Math.ceil(totalMs / 1000); // will be >= 7
    setCountdown(secs);
    setShowSeconds(true);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    // keep prompt visible (no fade) during story
    setPromptOpacity(1);
    // hide text immediately for waves-only interlude, schedule next after totalMs
    const container = document.querySelector(`.${styles.centerText}`);
    if (container) container.classList.add('fade-out-temp');
    const advance = () => {
      setPromptBlink(true);
      setPromptOpacity(1);
      const lastId = (beats[beats.length - 1] || {}).id;
      if (b.id === lastId) {
        onFinal?.();
      } else {
        next();
      }
    };
    setTimeout(() => {
      if (container) {
        setTimeout(() => {
          container.classList.remove('fade-out-temp');
          advance();
        }, 500);
      } else {
        advance();
      }
    }, totalMs);
  }, { thresholdDelta: 0.07, cooldownMs: 900 });

  return (
    <>
      <div className={styles.centerText} aria-live="polite">
        <div className={`${styles.centerDim} ${styles.centerDimVisible}`} />
        {showCountdown ? (
          <div className={`${styles.timerTop} ${breathGlow ? styles.timerTopActive : styles.timerTopInactive} ${promptBlink ? styles.timerTopBlink : ''}`} style={{ opacity: promptOpacity, whiteSpace: 'pre-line' }}>
            {`${promptLabel}\n${showSeconds && countdown ? `${countdown}초` : ''}`}
          </div>
        ) : null}
        {isPausing ? (
          <div className={`${styles.centerMsg} ${styles.centerMsgVisible}`}>멈춤</div>
        ) : (
          <>
            <div className={`${styles.centerMsg} ${lineIdx === 0 ? styles.centerMsgVisible : ''}`}>
              {lineA}
            </div>
            {lineB ? (
              <div className={`${styles.centerMsg} ${lineIdx === 1 ? styles.centerMsgVisible : ''}`}>
                {lineB}
              </div>
            ) : null}
          </>
        )}
      </div>
      {/* Debug: next-only button */}
      <button
        type="button"
        className={`${styles.toggleBtn} ${styles.debugNext} ${styles.debugBtn}`}
        onClick={next}
        aria-label="다음"
      >
        →
      </button>
    </>
  );
}


