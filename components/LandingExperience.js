import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import styles from '../styles/Index.module.css';
import Background from '../components/Background';
import GlassModal from '../components/GlassModal';
import BreathEngine from '../components/BreathEngine';
import FinalOverlay from './FinalOverlay';
import OpenInChromePrompt from './OpenInChromePrompt';
import { useAudio } from '../hooks/useAudio';

export default function LandingExperience() {
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const timersRef = useRef([]);
  // Wave group helpers for story sequencing
  const GROUPS = useRef({
    1: ['1-1', '1-2', '1-3', '1-4', '1-5'],
    2: ['2-1', '2-2', '2-3', '2-4'],
    3: ['3-1', '3-2', '3-3'],
    4: ['4-1', '4-2', '4-3', '4-4'],
  });
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
  const [mode478, setMode478] = useState(true);
  const [mode446, setMode446] = useState(false);
  const [modeHalf, setModeHalf] = useState(false);
  // single flow (meditation). Mode picker removed.
  const [showTopCapsule, setShowTopCapsule] = useState(false);
  const [stageColor, setStageColor] = useState('#000');
  const [showEngine, setShowEngine] = useState(false);
  const [finalTransition, setFinalTransition] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [finalHold, setFinalHold] = useState(false);
  const topCapsuleRef = useRef(null);
  const [capsuleHeight, setCapsuleHeight] = useState(0);
  const { playLoop, stopLoop, resumeLoop } = useAudio();
  const bgmStartedRef = useRef(false);
  const [ampScale, setAmpScale] = useState(1);
  const [breathCount, setBreathCount] = useState(0);
  // track last directive to avoid redundant state churn
  const lastWaveKeyRef = useRef('');
  // soft re-entry groups (opacity-only)
  const [softReenterGroups, setSoftReenterGroups] = useState(() => new Set());
  const incrementBreathCount = () => {
    if (typeof window === 'undefined') return;
    try {
      const cur = parseInt(window.localStorage.getItem('manpa_breath_count') || '0', 10) || 0;
      const next = cur + 1;
      window.localStorage.setItem('manpa_breath_count', String(next));
      setBreathCount(next);
    } catch {}
  };
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cur = parseInt(window.localStorage.getItem('manpa_breath_count') || '0', 10) || 0;
      setBreathCount(cur);
    } catch {}
  }, []);

  const [showHeadphoneHint, setShowHeadphoneHint] = useState(true);
  const [introReady, setIntroReady] = useState(false);
  const [showBreathGuide, setShowBreathGuide] = useState(false);
  const [showExhaleHint, setShowExhaleHint] = useState(false);

  // Headphone hint then start intro
  useEffect(() => {
    setStageColor('#000');
    const t = setTimeout(() => {
      setShowHeadphoneHint(false);
      setIntroReady(true);
      resumeLoop();
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!introReady) return;
    const stepIntervals = [1400, 1100, 900, 800]; // faster reveal cadence
    const steps = [
      ['1-1', '1-2', '1-3', '1-4', '1-5'],
      ['2-1', '2-2', '2-3', '2-4'],
      ['3-1', '3-2', '3-3'],
      ['4-1', '4-2', '4-3', '4-4'],
    ];
    const add = (ids) => setVisibleIds((prev) => new Set([...prev, ...ids]));
    let acc = 0;
    steps.forEach((ids, idx) => {
      const delay = stepIntervals[Math.min(idx, stepIntervals.length - 1)];
      timersRef.current.push(setTimeout(() => add(ids), acc));
      acc += delay;
    });

    const ENTRANCE_MS = 800;
    const lastStepDelay = (stepIntervals[0] + stepIntervals[1] + stepIntervals[2] + stepIntervals[3]) - stepIntervals[0];
    const brandDelay = lastStepDelay + ENTRANCE_MS + 1000;
    const brandTimer = setTimeout(() => {
      setBrandVisible(true);
      const CHAR_COUNT = '萬波息笛'.length;
      const STAGGER_MS = 750;
      const EXTRA_DELAY = 1200; // slower Hangul appearance
      const taglineTimer = setTimeout(() => setTaglineVisible(true), CHAR_COUNT * STAGGER_MS + EXTRA_DELAY);
      setCanRequestMic(true);
      resumeLoop();
      postTimersRef.current.push(taglineTimer);
    }, brandDelay);
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
      clearTimeout(brandTimer);
    };
  }, [introReady]);
  // Recompute capsule height once engine is shown and on resize
  useEffect(() => {
    if (!showEngine) return;
    const measure = () => {
      if (topCapsuleRef.current) {
        setCapsuleHeight(topCapsuleRef.current.offsetHeight || 0);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 0);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(t);
    };
  }, [showEngine]);

  // BGM: start from story engine; keep looping; ignore triggers
  useEffect(() => {
    if (showEngine && !bgmStartedRef.current) {
      const bgmPath = encodeURI('/music/bgm (1).mp3');
      playLoop(bgmPath, { volume: 0.6 });
      bgmStartedRef.current = true;
    }
  }, [showEngine, playLoop]);

  // Auto-open mic modal 2s after tagline appears if user didn't start
  useEffect(() => {
    if (taglineVisible && !micRequested && !showMicModal) {
      const t = setTimeout(() => setShowMicModal(true), 4000);
      return () => clearTimeout(t);
    }
  }, [taglineVisible, micRequested, showMicModal]);

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
  // Wave directive handler (from BreathEngine)
  const applyWaveDirective = (directive) => {
    if (!directive) return;
    // Build visible id set from requested groups
    if (directive.type === 'show' && Array.isArray(directive.groups)) {
      const key = `show:${directive.groups.sort().join(',')}|re:${(directive.reenter || []).sort().join(',')}`;
      if (lastWaveKeyRef.current === key) return;
      lastWaveKeyRef.current = key;
      const ids = [];
      directive.groups.forEach((g) => ids.push(...(GROUPS.current[g] || [])));
      setVisibleIds(new Set(ids));
      setReenterGroups(new Set(directive.reenter || []));
      setSoftReenterGroups(new Set(directive.softReenter ? (directive.reenter || []) : []));
      setExitGroups(new Set());
      return;
    }
    if (directive.type === 'flashHide' && Array.isArray(directive.hideGroups)) {
      // Story-only: instantly hide specified groups (no opacity animation)
      setVisibleIds((prev) => {
        const toHide = new Set();
        directive.hideGroups.forEach((g) => (GROUPS.current[g] || []).forEach((id) => toHide.add(id)));
        const next = new Set();
        prev.forEach((id) => { if (!toHide.has(id)) next.add(id); });
        return next;
      });
      setExitGroups(new Set());
      return;
    }
  };

  return (
    <>
      <Background
        visibleIds={visibleIds}
        exiting={transitionOut}
        reenterGroups={reenterGroups}
        exitGroups={exitGroups}
        stageColor={stageColor}
        isIntro={!showEngine}
        dimOverlay={((showEngine || showFinal || finalHold) && (stageColor === '#000000' || stageColor === '#000')) ? (showFinal ? 0.75 : 0.65) : 0}
        ampScale={ampScale}
        softReenterGroups={softReenterGroups}
      />
      <main className={`${styles.main} ${stageColor && String(stageColor).toUpperCase() === '#DBE7EA' ? styles.lightTheme : ''}`}>
        <OpenInChromePrompt />
        {/* sync mini logo height with capsule height */}
        {showEngine ? null : null}
        {showHeadphoneHint ? (
          <div className={styles.centerText}>
            <div className={`${styles.centerDim} ${styles.centerDimVisible}`} />
            <div className={`${styles.centerMsg} ${styles.centerMsgVisible} ${styles.hintMsg}`}>
              이어폰 사용을 통해<br/>더 깊이있는 체험이 가능합니다
            </div>
          </div>
        ) : null}
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
          title={<><span>‘만파식적’이(가) 마이크에</span><br /><span style={{ display: 'inline-block', textIndent: '0', paddingLeft: '0.6em' }}>접근하려고 합니다.</span></>}
          body={<><div>마이크 사용을 허가해주세요.</div></>}
          secondaryLabel="허용 안 함"
          onSecondary={() => setShowMicModal(false)}
          primaryLabel="확인"
          plain
          onPrimary={async () => {
            await requestMic();
            setShowMicModal(false);
            setTypoFade(true);
             resumeLoop(); // safeguard against mic permission side-effect
            // begin meditation flow automatically after 2s
            postTimersRef.current.push(setTimeout(() => {
               // Show 4s breath guide on dark screen, then start engine
               setStageColor('#000');
               setShowBreathGuide(true);
               setBrandVisible(false);
               setTaglineVisible(false);
               const g = setTimeout(() => {
                // after 4s primary guide, show 3s exhale hint before starting
                setShowBreathGuide(false);
                setShowExhaleHint(true);
                const h = setTimeout(() => {
                  setShowExhaleHint(false);
                  // start new breathing session; count up
                  incrementBreathCount();
                  setShowEngine(true);
                  setStageColor('#DBE7EA'); // start story on bright background
                  setShowTopCapsule(true); // ensure capsules are shown from the first narrative message
                }, 3000);
                postTimersRef.current.push(h);
               }, 4000);
               postTimersRef.current.push(g);
            }, 2000));
          }}
        />
         {showBreathGuide ? (
           <div className={styles.centerText}>
             <div className={`${styles.centerDim} ${styles.centerDimVisible}`} />
             <div className={`${styles.centerMsg} ${styles.centerMsgVisible} ${styles.guideMsg}`}>
              4초간 들이쉬고, 잠시 멈춘 뒤<br/>8초 동안 '입으로' 내쉬어 보세요
             </div>
           </div>
         ) : null}
         {showExhaleHint ? (
           <div className={styles.centerText}>
             <div className={`${styles.centerDim} ${styles.centerDimVisible}`} />
             <div className={`${styles.centerMsg} ${styles.centerMsgVisible} ${styles.guideMsg}`}>
               날숨은 소리가 마이크 가까이<br/>잘 들리도록 크게 내쉬어주세요
             </div>
           </div>
         ) : null}
        {showEngine ? (
          <div className={`${styles.fadeIn} ${styles.fadeInVisible}`}>
            <BreathEngine
              onBgColor={setStageColor}
              onFirstBeat={() => setShowTopCapsule(true)}
              onWaveDirective={applyWaveDirective}
              onSectionChange={(chapter) => {
                // Intensify waves on chapter 8, normal elsewhere
                if (String(chapter) === '8') {
                  setAmpScale(2.2);
                } else {
                  setAmpScale(1);
                }
              }}
              onFinal={() => {
                // Dark waves-only for 3s, then to mic input overlay
                setStageColor('#000');
                setFinalHold(true);
                setShowEngine(false);
                setTimeout(() => {
                  setShowFinal(true);
                  setFinalHold(false);
                }, 3000);
              }}
            />
          </div>
        ) : null}
        {showEngine ? (
          <>
            <img src="/img/manpa.png" alt="manpa" className={styles.miniLogo} style={capsuleHeight ? { height: `${capsuleHeight}px` } : undefined} />
            <div ref={topCapsuleRef} className={`${styles.capsuleTop} ${styles.fadeIn} ${styles.fadeInVisible} ${finalTransition ? styles.fadeOutSlow : ''}`}>
              <div className={styles.capsuleDate}>
                {new Date().getFullYear()}.{String(new Date().getMonth()+1).padStart(2,'0')}.{String(new Date().getDate()).padStart(2,'0')}
              </div>
              <div className={styles.capsuleSub}>{breathCount}번째 호흡</div>
            </div>
            <div className={`${styles.bottomToggles} ${styles.fadeIn} ${styles.fadeInVisible} ${finalTransition ? styles.fadeOutSlow : ''}`}>
              <button className={`${styles.toggleBtn} ${styles.toggleBtn478} ${mode478 ? styles.toggleActive478 : ''}`} onClick={() => setMode478((v)=>!v)}>4-7-8</button>
              <button className={`${styles.toggleBtn} ${mode446 ? styles.toggleActive : ''}`} onClick={() => setMode446((v)=>!v)}>4-4-6</button>
              <button className={`${styles.toggleBtn} ${modeHalf ? styles.toggleActive : ''}`} onClick={() => setModeHalf((v)=>!v)}>1:2</button>
            </div>
          </>
        ) : null}
        {(showFinal) ? (
          <div className={`${styles.capsuleTop} ${styles.fadeIn} ${styles.fadeInVisible}`}>
            <div className={styles.capsuleDate}>
              {new Date().getFullYear()}.{String(new Date().getMonth()+1).padStart(2,'0')}.{String(new Date().getDate()).padStart(2,'0')}
            </div>
            <div className={styles.capsuleSub}>{breathCount}번째 호흡</div>
          </div>
        ) : null}
        {showFinal ? (
          <FinalOverlay
            onRestart={() => {
              setShowFinal(false);
              setStageColor('#DBE7EA');
              // count next session
              incrementBreathCount();
              setShowEngine(true);
              setShowTopCapsule(true);
            }}
            onClose={() => {
              // go back to the initial landing page
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
          />
        ) : null}
        {!showEngine ? (
        <div className={`${styles.brand} ${brandVisible ? styles.brandVisible : ''} ${typoFade ? styles.brandFadeOut : ''}`}>
          {'萬波息笛'.split('').map((ch, i) => (
            <span key={i} className={styles.brandChar} style={{ ['--i']: i }} aria-hidden>
              {ch}
            </span>
          ))}
        </div>
        ) : null}
        {!showEngine ? (
        <div className={`${styles.tagline} ${taglineVisible ? styles.taglineVisible : ''} ${typoFade ? styles.taglineFadeOut : ''}`}>
          <div className={styles.taglineCol}>마음의 파동</div>
          <div className={styles.taglineCol}>흐홉으로 잠재우는,</div>
        </div>
        ) : null}
      </main>
    </>
  );
}


