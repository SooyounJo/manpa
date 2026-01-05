import React, { useEffect, useRef, useState } from 'react';
import styles from '../styles/Index.module.css';

export default function FinalOverlay({ onRestart, onClose }) {
  const [page, setPage] = useState(0); // 0 -> first, 1 -> second
  const recogRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [prelude, setPrelude] = useState(true); // waves-only for 3s
  const [word, setWord] = useState('');
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    // waves-only for 3 seconds before showing page 0
    const t = setTimeout(() => setPrelude(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const startListening = () => {
    if (page !== 0 || listening) return;
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {
      // fallback: proceed if not supported
      setWord('나의');
      setCanProceed(true);
      return;
    }
    try {
      const recog = new Speech();
      recog.lang = 'ko-KR';
      recog.interimResults = false;
      recog.maxAlternatives = 1;
      recog.onstart = () => setListening(true);
      recog.onresult = (e) => {
        try {
          const transcript = (e.results?.[0]?.[0]?.transcript || '').trim();
          if (transcript) setWord(transcript);
        } catch {}
        setListening(false);
        try { recog.stop(); } catch {}
        setCanProceed(true); // enable Next explicitly
      };
      recog.onerror = () => {
        setListening(false);
        try { recog.stop(); } catch {}
        setCanProceed(true);
      };
      recog.onend = () => setListening(false);
      recogRef.current = recog;
      recog.start();
    } catch {
      setCanProceed(true);
    }
  };
  const stopListening = () => {
    try {
      recogRef.current?.stop?.();
    } catch {}
    setListening(false);
    if (!word) setWord('나의');
    setCanProceed(true);
  };

  return (
    <div className={styles.finalOverlay}>
      {prelude ? null : (
        <>
          {page === 0 ? (
            <div className={`${styles.finalPage} ${styles.finalPageVisible}`}>
              <div className={styles.finalTextMain}>오늘 당신은</div>
              <div className={styles.finalMiddle}>
                {word ? (
                  <div className={styles.finalWordWrap}>
                    <span className={styles.finalQuote} aria-hidden>&apos;</span>
                    <div className={styles.finalWord}>{word}</div>
                    <span className={styles.finalQuote} aria-hidden>&apos;</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`${styles.finalMicLargeBtn} ${listening ? styles.finalMicBtnActive : ''}`}
                    onClick={listening ? stopListening : startListening}
                    aria-label={listening ? '말하기 중지' : '마이크로 말하기 시작'}
                  >
                    <svg width="40" height="52" viewBox="0 0 92 119" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M66 26.2321C66 14.0819 57.3218 4.5 46 4.5C34.6782 4.5 25 14.3705 25 26.5208" stroke="white" strokeWidth="9"/>
                      <path d="M25 53.2321C25 65.3824 33.6782 75.2528 45 75.2528C56.3218 75.2528 66 65.3823 66 53.232" stroke="white" strokeWidth="9"/>
                      <path d="M4.5 51.2323C4.49999 75.5099 22.068 95.232 44.9878 95.2321C67.9076 95.2321 87.5 75.5096 87.5 51.2321" stroke="white" strokeWidth="9" strokeLinecap="round"/>
                      <rect x="61.5" y="26.2321" width="9" height="27" fill="white"/>
                      <rect x="20.5" y="26.2321" width="9" height="27" fill="white"/>
                      <line x1="45" y1="98.7321" x2="45" y2="113.732" stroke="white" strokeWidth="9" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
              <div className={`${styles.finalTextMain} ${styles.finalTextBottom}`}>파도를 잠재웠습니다.</div>
              {(() => {
                const msg = listening
                  ? '말하기가 끝났다면 마이크를 꺼 주세요.'
                  : (word ? '' : '마이크 버튼을 누르고 말해보세요.');
                return msg ? <div className={styles.finalMicHint}>{msg}</div> : null;
              })()}
              {(!listening && canProceed) ? (
                <button type="button" className={styles.finalNextBtn} onClick={() => setPage(1)}>다음</button>
              ) : null}
            </div>
          ) : (
            <div className={`${styles.finalPage} ${styles.finalPageVisible}`}>
              <div className={styles.finalTextMain}>
                한 번 더 잠재우고 싶다면,{'\n'}
                언제든 다시 숨을 들이쉬고,{'\n'}
                내쉬어 주세요.
              </div>
              <div className={styles.finalActionBar}>
                <button type="button" className={styles.finalActionBtn} onClick={onRestart}>한 번 더</button>
                <button type="button" className={styles.finalActionBtn} onClick={onClose}>마침</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


