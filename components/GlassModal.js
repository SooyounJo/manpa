import React from 'react';
import styles from '../styles/Overlay.module.css';

export default function GlassModal({
  open,
  title,
  body,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  plain = false, // if true: no blur, solid white base
}) {
  if (!open) return null;
  const overlayClass = plain ? styles.overlayPlain : `${styles.overlay} ${styles.overlayDim}`;
  const modalClass = plain ? styles.modalPlain : styles.modal;
  return (
    <div className={overlayClass} role="dialog" aria-modal="true">
      <div className={modalClass} role="document">
        {title ? <div className={styles.header}>{title}</div> : null}
        {body ? <div className={styles.body}>{body}</div> : null}
        <div className={styles.actions}>
          {secondaryLabel ? (
            <button type="button" className={styles.btnSecondary} onClick={onSecondary}>
              {secondaryLabel}
            </button>
          ) : null}
          {primaryLabel ? (
            <button type="button" className={styles.btnPrimary} onClick={onPrimary}>
              {primaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}


