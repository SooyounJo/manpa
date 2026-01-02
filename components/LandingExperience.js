import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import styles from '../styles/Index.module.css';
import Background from '../components/Background';
import GlassModal from '../components/GlassModal';
import ModePicker from '../components/ModePicker';

export default function LandingExperience() {
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const timersRef = useRef([]);
  const [brandVisible, setBrandVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [canRequestMic, setCanRequestMic] = useState(false);
  const [micRequested, setMicRequested] = useState(false);
  const [showMicModal, setShowMicModal] = useState(false);
  const [transitionOut, setTransitionOut] = useState(false);
  const [reenterGroups, setReenterGroups] = useState(() => new Set());
  const [exitGroups, setExitGroups] = useState(() => new Set());
  const [messageIndex, setMessageIndex] = useState(-1);
  const [phase, setPhase] = useState('idle'); // idle | prelude | closing
  const postTimersRef = useRef([]);
  const [typoFade, setTypoFade] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [mode478, setMode478] = useState(false);
  const [mode446, setMode446] = useState(false);
  const [modeHalf, setModeHalf] = useState(false);
  const [showModePicker, setShowModePicker] = useState(false);

  useEffect(() => {
    const STEP_MS = 2000; // faster landing reveal
    const steps = [
      ['1-1', '1-2', '1-3', '1-4', '1-5'],
      ['2-1', '2-2', '2-3', '2-4'],
      ['3-1', '3-2', '3-3'],
      ['4-1', '4-2', '4-3', '4-4'],
    ];
    const add = (ids) => setVisibleIds((prev) => new Set([...prev, ...ids]));
    timersRef.current = steps.map((ids, idx) => setTimeout(() => add(ids), idx * STEP_MS));

    const ENTRANCE_MS = 1200;
    const lastStepDelay = (steps.length - 1) * STEP_MS;
    const brandDelay = lastStepDelay + ENTRANCE_MS + 1000;
    const brandTimer = setTimeout(() => {
      setBrandVisible(true);
      const CHAR_COUNT = '萬波息笛'.length;
      const STAGGER_MS = 750;
      const EXTRA_DELAY = 1200; // slower Hangul appearance
      const taglineTimer = setTimeout(() => setTaglineVisible(true), CHAR_COUNT * STAGGER_MS + EXTRA_DELAY);
      setCanRequestMic(true);
      postTimersRef.current.push(taglineTimer);
    }, brandDelay);
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
      clearTimeout(brandTimer);
    };
  }, []);

  const requestMic = async () => {
    if (micRequested) return;
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {
    } finally {
      setMicRequested(true);
      setCanRequestMic(false);
    }
  };

  // Not used for landing anymore; messages are driven by mode selection

  return (
    <>
      <Background visibleIds={visibleIds} exiting={transitionOut} reenterGroups={reenterGroups} exitGroups={exitGroups} />
      <main className={styles.main}>
        {canRequestMic && !micRequested && !showMicModal ? (
          <button
            type="button"
            className={styles.micOverlay}
            onClick={() => setShowMicModal(true)}
            aria-label="화면 탭하여 마이크 권한 요청"
          />
        ) : null}
        <GlassModal
          open={showMicModal}
          title="마이크 권한 요청"
          body={<><div>체험을 진행하기 위해</div><div>마이크 접근을 허용해주세요.</div></>}
          secondaryLabel="닫기"
          onSecondary={() => setShowMicModal(false)}
          primaryLabel="허용"
          plain
          onPrimary={async () => {
            await requestMic();
            setShowMicModal(false);
            setTypoFade(true);
            postTimersRef.current.push(setTimeout(() => setShowModePicker(true), 2000));
          }}
        />
        <ModePicker
          open={showModePicker}
          onPick={() => {
            setShowModePicker(false);
            const base = 2000;
            // Begin prelude 4-step narrative
            setPhase('prelude');
            setMessageIndex(0);
            // exit then re-enter waves over time
            postTimersRef.current.push(setTimeout(() => setExitGroups(new Set([4])), base));
            postTimersRef.current.push(setTimeout(() => setExitGroups(new Set([4, 3])), base + 900));
            postTimersRef.current.push(setTimeout(() => setExitGroups(new Set([4, 3, 2])), base + 1800));
            postTimersRef.current.push(setTimeout(() => setReenterGroups(new Set([2])), base + 3000));
            postTimersRef.current.push(setTimeout(() => setReenterGroups(new Set([2, 3])), base + 6000));
            postTimersRef.current.push(setTimeout(() => setReenterGroups(new Set([2, 3, 4])), base + 9000));
            // advance prelude messages
            postTimersRef.current.push(setTimeout(() => setMessageIndex(1), 3000));
            postTimersRef.current.push(setTimeout(() => setMessageIndex(2), 6000));
            postTimersRef.current.push(setTimeout(() => setMessageIndex(3), 9000));
            // switch to closing 2-step narrative after prelude ends
            postTimersRef.current.push(setTimeout(() => {
              setPhase('closing');
              setMessageIndex(0);
            }, 12000));
            postTimersRef.current.push(setTimeout(() => setMessageIndex(1), 15000));
            // reveal controls after closing
            postTimersRef.current.push(setTimeout(() => setShowControls(true), 18000));
          }}
        />
        <div className={styles.centerText} aria-live="polite" style={{ display: messageIndex >= 0 ? 'grid' : 'none' }}>
          {phase === 'prelude' ? (
            <>
              <div className={`${styles.centerMsg} ${messageIndex === 0 ? styles.centerMsgVisible : ''}`}>
                오늘 몇 번의 파도가<br/><br/>당신의 마음 속에 일었나요?
              </div>
              <div className={`${styles.centerMsg} ${messageIndex === 1 ? styles.centerMsgVisible : ''}`}>
                아주 작은 흔들림부터,<br/><br/>조금 더 크게<br/>밀려온 파도들까지
              </div>
              <div className={`${styles.centerMsg} ${messageIndex === 2 ? styles.centerMsgVisible : ''}`}>
                지금은 그것들을<br/><br/>억지로 멀리 보내지<br/>않아도 됩니다
              </div>
              <div className={`${styles.centerMsg} ${messageIndex === 3 ? styles.centerMsgVisible : ''}`}>
                그저 천천히,<br/><br/>하나씩<br/>떠올려봅니다
              </div>
            </>
          ) : null}
          {phase === 'closing' ? (
            <>
              <div className={`${styles.centerMsg} ${messageIndex === 0 ? styles.centerMsgVisible : ''}`}>
                오늘 당신은<br/><br/>파도를 잠재웠습니다.
                <div style={{ fontSize: 36, marginTop: 12 }}>🎤</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 12 }}>마이크에 대고 말해보세요.</div>
              </div>
              <div className={`${styles.centerMsg} ${messageIndex === 1 ? styles.centerMsgVisible : ''}`}>
                한 번 더 잠재우고 싶다면,<br/><br/>언제든 다시 숨을 들이쉬고,<br/>내쉬어 보세요.
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                  <button className={styles.toggleBtn}>한 번 더</button>
                  <button className={styles.toggleBtn}>마침</button>
                </div>
              </div>
            </>
          ) : null}
        </div>
        {showControls ? (
          <>
            <div className={styles.capsuleTop}>
              <div className={styles.capsuleDate}>
                {new Date().getFullYear()}.{String(new Date().getMonth()+1).padStart(2,'0')}.{String(new Date().getDate()).padStart(2,'0')}
              </div>
              <div className={styles.capsuleSub}>1번째 호흡</div>
            </div>
            <div className={styles.bottomToggles}>
              <button className={`${styles.toggleBtn} ${mode478 ? styles.toggleActive : ''}`} onClick={() => setMode478((v)=>!v)}>4-7-8</button>
              <button className={`${styles.toggleBtn} ${mode446 ? styles.toggleActive : ''}`} onClick={() => setMode446((v)=>!v)}>4-4-6</button>
              <button className={`${styles.toggleBtn} ${modeHalf ? styles.toggleActive : ''}`} onClick={() => setModeHalf((v)=>!v)}>1:2</button>
            </div>
          </>
        ) : null}
        <div className={`${styles.brand} ${brandVisible ? styles.brandVisible : ''} ${typoFade ? styles.brandFadeOut : ''}`}>
          {'萬波息笛'.split('').map((ch, i) => (
            <span key={i} className={styles.brandChar} style={{ ['--i']: i }} aria-hidden>
              {ch}
            </span>
          ))}
        </div>
        <div className={`${styles.tagline} ${taglineVisible ? styles.taglineVisible : ''} ${typoFade ? styles.taglineFadeOut : ''}`}>
          <div className={styles.taglineCol}>마음의 파동</div>
          <div className={styles.taglineCol}>흐홉으로 잠재우는,</div>
        </div>
      </main>
    </>
  );
}


