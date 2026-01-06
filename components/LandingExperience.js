import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import styles from '../styles/Index.module.css';
import Background from '../components/Background';
import GlassModal from '../components/GlassModal';
import BreathEngine from '../components/BreathEngine';
import FinalOverlay from './FinalOverlay';
import OpenInChromePrompt from './OpenInChromePrompt';
import { useAudio } from '../hooks/useAudio';
import { isIOSDevice } from '../utils/platform';

const GUIDE_SCREENS = [
  // 1. 작품 설명 (3파트)
  {
    id: 'g-1',
    content: (
      <>
        들숨과 날숨을 감지하여, 파도 기반 비주얼
        <br />
        사운드 스케이프가 실시간 변화하는
        <br />
        <strong>인터랙티브 힐링 미디어 아트 앱입니다</strong>
      </>
    ),
  },
  {
    id: 'g-2',
    content: (
      <>
        호흡의 속도·강도에 따라 파도의 움직임,
        <br />
        음향의 질감이 유기적으로 반응하며
        <br />
        사용자에게 개인화된 <strong>몰입·명상 경험</strong>을 제공합니다.
      </>
    ),
  },
  // 2. 세부내용 (2파트)
  {
    id: 'g-4',
    content: (
      <>
        만파식적은
        <br />
        거친 파도를 잠재우고, 마음을 편안하게 하는
        <br />
        <strong>[신라시대 문무왕]</strong> 전설 속의 피리입니다
      </>
    ),
  },
  {
    id: 'g-5',
    content: (
      <>
        이 ʻ만파식적:호흡으로 잠재우는 마음의 파동’은,
        <br />
        그 의미를 현대적으로 확장해
        <br />
        <strong>파도를 잠재우는 힘 = 내 마음의 파동</strong>을 다스리는
        <br />
        경험으로 풀어냅니다.
      </>
    ),
  },
  // 3. 작품 참여 방법 (2파트)
  {
    id: 'g-7',
    text: '중앙에 뜨는 들숨, 멈춤, 날숨에 대한 설명을 따라\n입으로 소리 내며 숨쉬어 주세요.',
    header: 'tip',
  },
];

export default function LandingExperience() {
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const timersRef = useRef([]);
  const waveTimersRef = useRef([]);
  // Wave group helpers for story sequencing
  const GROUPS = useRef({
    1: ['1-1', '1-2', '1-3', '1-4', '1-5'],
    2: ['2-1', '2-2', '2-3', '2-4'],
    3: ['3-1', '3-2', '3-3'],
    4: ['4-1', '4-2', '4-3', '4-4', '4-5'],
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
  const [breathCount, setBreathCount] = useState(1); // story chapter (1..8)
  // track last directive to avoid redundant state churn
  const lastWaveKeyRef = useRef('');
  // soft re-entry groups (opacity-only)
  const [softReenterGroups, setSoftReenterGroups] = useState(() => new Set());
  // Early audio permission modal — init closed on SSR to avoid hydration mismatch
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [todayStr, setTodayStr] = useState('');
  const [guideIdx, setGuideIdx] = useState(-1); // -1: not showing, 0..N: guide pages
  const resetWavesToGroup1 = () => {
    try {
      setVisibleIds(new Set(GROUPS.current?.[1] || []));
      setReenterGroups(new Set());
      setSoftReenterGroups(new Set());
      setExitGroups(new Set());
      lastWaveKeyRef.current = '';
    } catch {}
  };

  const clearWaveTimers = () => {
    try {
      (waveTimersRef.current || []).forEach((t) => clearTimeout(t));
    } catch {}
    waveTimersRef.current = [];
  };
  // Story chapter is driven by BreathEngine's onSectionChange (no localStorage counter).

  // Mark mounted and set client-only states to prevent SSR/CSR mismatch
  useEffect(() => {
    setMounted(true);
    // Gate audio modal after mount (all devices). User must confirm to proceed.
    setShowAudioModal(true);
    // Compute date string once on client to avoid timezone mismatch issues
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setTodayStr(`${y}.${m}.${day}`);
  }, []);

  const [showHeadphoneHint, setShowHeadphoneHint] = useState(true);
  const [headphoneFadeOut, setHeadphoneFadeOut] = useState(false);
  const [introReady, setIntroReady] = useState(false);
  const [storyPrelude, setStoryPrelude] = useState(false); // guide -> story: bg first, then text/capsules
  const [storyUiVisible, setStoryUiVisible] = useState(false); // fade-in for story UI (capsules + text)

  useEffect(() => {
    if (!showEngine) {
      setStoryUiVisible(false);
      return;
    }
    setStoryUiVisible(false);
    const t = setTimeout(() => setStoryUiVisible(true), 50);
    return () => clearTimeout(t);
  }, [showEngine]);

  // Headphone hint then start intro (blocked until audio permission confirmed)
  useEffect(() => {
    if (!mounted) return;
    if (showAudioModal) return; // must confirm audio before proceeding
    setStageColor('#000');
    setHeadphoneFadeOut(false);
    const t1 = setTimeout(() => setHeadphoneFadeOut(true), 2600);
    const t2 = setTimeout(() => {
      setShowHeadphoneHint(false);
      setIntroReady(true);
      resumeLoop();
    }, 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mounted, showAudioModal, resumeLoop]);

  useEffect(() => {
    if (!introReady) return;
    const add = (ids) => setVisibleIds((prev) => new Set([...prev, ...ids]));
    const group1 = ['1-1', '1-2', '1-3', '1-4', '1-5'];
    const group2 = ['2-1', '2-2', '2-3', '2-4'];
    const group3 = ['3-1', '3-2', '3-3'];
    const group4 = ['4-1', '4-2', '4-3', '4-4', '4-5'];

    // Organic overlap: 2 starts around when 1-4 arrives; 3 starts around when 2-3 arrives; 4 starts around when 3-2 arrives.
    const g2At = 900;
    const g3At = 1650;
    const g4At = 2400;

    timersRef.current.push(setTimeout(() => add(group1), 0));
    timersRef.current.push(setTimeout(() => add(group2), g2At));
    timersRef.current.push(setTimeout(() => add(group3), g3At));
    timersRef.current.push(setTimeout(() => add(group4), g4At));

    const brandDelay = g4At + 1500; // after 4 group is mostly in
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
      const bgmPath = encodeURI('/music/bgm_new.mp3');
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

  const handleGuideNext = () => {
    setGuideIdx((prev) => {
      const next = prev + 1;
      if (next >= GUIDE_SCREENS.length) {
        // 마지막 페이지 후 바로 스토리 시작
        setBreathCount(1);
        setStageColor('#DBE7EA');
        // Show background/waves first, then bring in story text + capsules after 3s
        setStoryPrelude(true);
        // Start with background only (no waves), then let 1-x translate in.
        try {
          setVisibleIds(new Set());
          setReenterGroups(new Set());
          setSoftReenterGroups(new Set());
          setExitGroups(new Set());
          lastWaveKeyRef.current = '';
        } catch {}
        postTimersRef.current.push(setTimeout(() => {
          resetWavesToGroup1(); // now 1-x enters smoothly
        }, 120));
        postTimersRef.current.push(setTimeout(() => {
          setShowEngine(true);
          setShowTopCapsule(true);
          setStoryPrelude(false);
        }, 3000));
        return -1;
      }
      return next;
    });
  };
  const handleGuidePrev = () => {
    setGuideIdx((prev) => (prev > 0 ? prev - 1 : 0));
  };

  // Not used for landing anymore; messages are driven by mode selection
  // Wave directive handler (from BreathEngine)
  const applyWaveDirective = (directive) => {
    if (!directive) return;
    clearWaveTimers();
    // Build visible id set from requested groups
    if (directive.type === 'show' && Array.isArray(directive.groups)) {
      const key = `show:${directive.groups.sort().join(',')}|re:${(directive.reenter || []).sort().join(',')}`;
      if (lastWaveKeyRef.current !== key) {
        lastWaveKeyRef.current = key;
      }
      const idsToAdd = [];
      directive.groups.forEach((g) => idsToAdd.push(...(GROUPS.current[g] || [])));
      // STORY: union only — never remove existing visible ids
      setVisibleIds((prev) => new Set([...prev, ...idsToAdd]));
      // STORY: do not reenter; prevent any fade/opacity by clearing reenter flags
      setReenterGroups(new Set());
      setSoftReenterGroups(new Set());
      setExitGroups(new Set());
      return;
    }
    if (directive.type === 'set' && Array.isArray(directive.groups)) {
      const ids = [];
      directive.groups.forEach((g) => ids.push(...(GROUPS.current[g] || [])));
      setVisibleIds(new Set(ids));
      setReenterGroups(new Set());
      setSoftReenterGroups(new Set());
      setExitGroups(new Set());
      lastWaveKeyRef.current = `set:${directive.groups.slice().sort().join(',')}`;
      return;
    }
    if (directive.type === 'burst' && Array.isArray(directive.sequence)) {
      const baseGroups = Array.isArray(directive.baseGroups) ? directive.baseGroups : [1];
      const stepMs = typeof directive.stepMs === 'number' ? directive.stepMs : 220;
      const resetAfterMs = typeof directive.resetAfterMs === 'number' ? directive.resetAfterMs : null;

      // Start from base (usually 1-x only)
      const baseIds = [];
      baseGroups.forEach((g) => baseIds.push(...(GROUPS.current[g] || [])));
      setVisibleIds(new Set(baseIds));
      setReenterGroups(new Set());
      setSoftReenterGroups(new Set());
      setExitGroups(new Set());
      lastWaveKeyRef.current = `burst:${baseGroups.join(',')}=>${directive.sequence.join(',')}`;

      // Then add groups sequentially
      directive.sequence.forEach((g, i) => {
        waveTimersRef.current.push(setTimeout(() => {
          setVisibleIds((prev) => {
            const next = new Set(prev);
            (GROUPS.current[g] || []).forEach((id) => next.add(id));
            return next;
          });
        }, Math.max(0, stepMs * i)));
      });

      // Reset back to base after beat finishes (so next exhale can "burst" again)
      if (resetAfterMs != null) {
        waveTimersRef.current.push(setTimeout(() => {
          setVisibleIds(new Set(baseIds));
        }, Math.max(0, resetAfterMs)));
      }
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
        isIntro={!showEngine && !storyPrelude}
        dimOverlay={
          (guideIdx >= 0 && !showEngine && !showFinal && !finalHold)
            ? 0.8
            : ((showEngine || showFinal || finalHold) && (stageColor === '#000000' || stageColor === '#000'))
              ? (showFinal ? 0.75 : 0.65)
              : 0
        }
        ampScale={ampScale}
        softReenterGroups={softReenterGroups}
      />
      <main className={`${styles.main} ${stageColor && String(stageColor).toUpperCase() === '#DBE7EA' ? styles.lightTheme : ''}`}>
        <OpenInChromePrompt />
        {/* sync mini logo height with capsule height */}
        {showEngine ? null : null}
        {showHeadphoneHint ? (
          <div className={styles.centerText}>
            <div className={`${styles.centerDim} ${styles.centerDimVisible} ${headphoneFadeOut ? styles.centerDimFadeOut : ''}`} />
            <div className={`${styles.centerMsg} ${styles.centerMsgVisible} ${headphoneFadeOut ? styles.centerMsgFadeOut : ''} ${styles.hintMsg}`}>
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
        {/* Early audio permission modal to enable BGM at app start */}
        <GlassModal
          open={showAudioModal}
          title={<>배경 음악 재생을 허용할까요?</>}
          body={<>원활한 체험을 위해 음악을 미리 재생합니다.</>}
          primaryLabel="확인"
          plain
          onPrimary={() => {
            if (!bgmStartedRef.current) {
              const bgmPath = encodeURI('/music/bgm_new.mp3');
              // iOS: prime start inside a user gesture to unlock audio reliably
              playLoop(bgmPath, { volume: 0.6, prime: true });
              bgmStartedRef.current = true;
            }
            setShowAudioModal(false);
            resumeLoop();
          }}
        />
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
            // 2초 후 인트로 타이포 수거 + 호흡 가이드 스텝 시작
            postTimersRef.current.push(setTimeout(() => {
              setStageColor('#000');
              setBrandVisible(false);
              setTaglineVisible(false);
              setGuideIdx(0);
            }, 2000));
          }}
        />
        {guideIdx >= 0 && guideIdx < GUIDE_SCREENS.length && !showEngine && !showFinal && !finalHold ? (
          <div className={styles.centerTextInteractive}>
            <div className={`${styles.centerDim} ${styles.centerDimVisible}`} />
            <div className={styles.guideBlock}>
              {guideIdx === 3 ? null : (
                  <div className={`${styles.guideTitle} ${styles.guidePretendard}`}>
                  {GUIDE_SCREENS[guideIdx]?.header
                    ? GUIDE_SCREENS[guideIdx].header
                    : (guideIdx >= 2 ? '만파식적(萬波息笛)' : '작품설명')}
                </div>
              )}
                <div className={`${styles.guideText} ${styles.guidePretendard}`}>
                  {GUIDE_SCREENS[guideIdx].content ?? GUIDE_SCREENS[guideIdx].text}
                </div>
              <div className={styles.guideActions}>
                {guideIdx > 0 ? (
                  <button
                    type="button"
                    className={styles.guidePrevBtnInline}
                    onClick={handleGuidePrev}
                    aria-label="이전"
                  >
                    이전
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.guideNextBtnInline}
                  onClick={handleGuideNext}
                  aria-label={guideIdx === GUIDE_SCREENS.length - 1 ? '시작하기' : '다음'}
                >
                  {guideIdx === GUIDE_SCREENS.length - 1 ? '시작하기' : '다음'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {showEngine ? (
          <div className={`${styles.fadeIn} ${storyUiVisible ? styles.fadeInVisible : ''}`}>
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
                const n = parseInt(String(chapter), 10);
                if (!Number.isNaN(n)) setBreathCount(n);
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
            <img src="/img/manpa.png" alt="manpa" className={`${styles.miniLogo} ${styles.fadeIn} ${storyUiVisible ? styles.fadeInVisible : ''}`} style={capsuleHeight ? { height: `${capsuleHeight}px` } : undefined} />
            <div ref={topCapsuleRef} className={`${styles.capsuleTop} ${styles.fadeIn} ${storyUiVisible ? styles.fadeInVisible : ''} ${finalTransition ? styles.fadeOutSlow : ''}`}>
              <div className={styles.capsuleDate}>
                {mounted ? todayStr : ''}
              </div>
              <div className={styles.capsuleSub}>{breathCount}번째 호흡</div>
            </div>
            <div className={`${styles.bottomToggles} ${styles.fadeIn} ${storyUiVisible ? styles.fadeInVisible : ''} ${finalTransition ? styles.fadeOutSlow : ''}`} aria-hidden>
              <button className={`${styles.toggleBtn} ${styles.toggleBtn478} ${mode478 ? styles.toggleActive478 : ''}`} disabled>4-7-8</button>
              <button className={`${styles.toggleBtn} ${mode446 ? styles.toggleActive : ''}`} disabled>4-4-6</button>
              <button className={`${styles.toggleBtn} ${modeHalf ? styles.toggleActive : ''}`} disabled>1:2</button>
            </div>
          </>
        ) : null}
        {(showFinal) ? (
          <div className={`${styles.capsuleTop} ${styles.fadeIn} ${styles.fadeInVisible}`}>
            <div className={styles.capsuleDate}>
              {mounted ? todayStr : ''}
            </div>
            <div className={styles.capsuleSub}>{breathCount}번째 호흡</div>
          </div>
        ) : null}
        {showFinal ? (
          <FinalOverlay
            onRestart={() => {
              setShowFinal(false);
              setStageColor('#DBE7EA');
              resetWavesToGroup1(); // restart story with 1-x only
              setBreathCount(1);
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
        {/* Waves-only pre-final hold: show a small hint text */}
        {finalHold ? (
          <div className={styles.centerText} aria-hidden>
            <div className={`${styles.finalHint} ${styles.finalHintVisible}`}>곧 마무리 단계</div>
          </div>
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


