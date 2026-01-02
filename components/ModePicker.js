import React from 'react';
import styles from '../styles/Overlay.module.css';

export default function ModePicker({ open, onPick }) {
  if (!open) return null;
  return (
    <div className={`${styles.overlay} ${styles.overlayDim}`} role="dialog" aria-modal="true">
      <div className={styles.pickerStack} role="document" aria-label="체험 선택">
        <button type="button" className={styles.pickerBtn} onClick={() => onPick('meditation')}>
          명상편
        </button>
        <button type="button" className={styles.pickerBtn} onClick={() => onPick('historical')}>
          사극편
        </button>
      </div>
    </div>
  );
}


