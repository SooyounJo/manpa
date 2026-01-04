import React from 'react';
import styles from '../styles/Index.module.css';

export default function DebugNav({ onPrev, onNext }) {
  return (
    <>
      <button className={`${styles.toggleBtn} ${styles.debugPrev} ${styles.debugBtn}`} onClick={onPrev} aria-label="이전">←</button>
      <button className={`${styles.toggleBtn} ${styles.debugNext} ${styles.debugBtn}`} onClick={onNext} aria-label="다음">→</button>
    </>
  );
}


