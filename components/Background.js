import { memo } from 'react';
import styles from '../styles/Background.module.css';

const waves = [
  // group 1 (topmost layer)
  { id: '1-1', group: 1, src: '/wave/1-1.png' },
  { id: '1-2', group: 1, src: '/wave/1-2.png' },
  { id: '1-3', group: 1, src: '/wave/1-3.png' },
  { id: '1-4', group: 1, src: '/wave/1-4.png' },
  { id: '1-5', group: 1, src: '/wave/1-5.png' },
  // group 2
  { id: '2-1', group: 2, src: '/wave/2-1.png' },
  { id: '2-2', group: 2, src: '/wave/2-2.png' },
  { id: '2-3', group: 2, src: '/wave/2-3.png' },
  { id: '2-4', group: 2, src: '/wave/2-4.png' },
  // group 3
  { id: '3-1', group: 3, src: '/wave/3-1.png' },
  { id: '3-2', group: 3, src: '/wave/3-2.png' },
  { id: '3-3', group: 3, src: '/wave/3-3.png' },
  // group 4 (lowest layer)
  { id: '4-1', group: 4, src: '/wave/4-1.png' },
  { id: '4-2', group: 4, src: '/wave/4-2.png' },
  { id: '4-3', group: 4, src: '/wave/4-3.png' },
  { id: '4-4', group: 4, src: '/wave/4-4.png' },
  { id: '4-5', group: 4, src: '/wave/4-5.png' },
];

function Background({ visibleIds, exiting, reenterGroups, exitGroups, stageColor = '#000', dimOverlay = 0, ampScale = 1, softReenterGroups, isIntro = false }) {
  const computeZIndex = (group, id) => {
    // Ensure group 1 > 2 > 3 > 4
    const baseByGroup = { 1: 400, 2: 300, 3: 200, 4: 100 };
    const base = baseByGroup[group] || 0;
    // Within a group: x-1 highest, then x-2, x-3, x-4, x-5...
    const suffix = parseInt(id.split('-')[1], 10);
    const offset = 50 - (isNaN(suffix) ? 0 : suffix); // higher when suffix is smaller
    return base + offset;
  };

  const computeFloat = (group, id) => {
    const suffix = parseInt(id.split('-')[1], 10) || 0;
    // Deterministic pseudo-randoms per image for variety
    const seed1 = (group * 997 + suffix * 433) % 3000; // 0..2999
    const seed2 = (group * 593 + suffix * 271) % 2000; // 0..1999
    const durationMs = 5000 + seed1; // 5000..7999ms
    const delayMs = seed2; // 0..1999ms
    return { durationMs, delayMs };
  };

  const computeExit = (group, id) => {
    // group-specific outward directions
    // 2: up, 3: left, 4: right; 1 stays
    if (group === 1) return { x: 0, y: 0 };
    const suffix = parseInt(id.split('-')[1], 10) || 0;
    const magnitudeVw = 40 + (suffix * 5); // 45..65vw
    const magnitudeVh = 40 + (suffix * 4); // 44..56vh
    if (group === 2) return { x: 0, y: -magnitudeVh };
    if (group === 3) return { x: -magnitudeVw, y: 0 };
    if (group === 4) return { x: magnitudeVw, y: 0 };
    return { x: 0, y: 0 };
  };

  const computeAmplitude = (group, id) => {
    const suffix = parseInt(id.split('-')[1], 10) || 0;
    // Special handling for specific assets
    if (id === '2-2') {
      // Make this slice almost static to avoid left-edge gaps
      return { ax: 0.5, ay: 1 };
    }
    if (group === 1) {
      // Intro: subtle. Story: stronger immediately.
      const ax = isIntro ? 1 : 4;
      const ay = isIntro ? 2 : 5;
      return { ax, ay };
    }
    // Mild variance for deeper layers, with optional global multiplier
    const seedX = (group * 101 + suffix * 13) % 5; // 0..4
    const seedY = (group * 103 + suffix * 17) % 5; // 0..4
    // Make 3/4 more intense as requested
    const baseAx =
      group === 3 ? (10 + seedX) :
      group === 4 ? (12 + seedX) :
      (6 + seedX);
    const baseAy =
      group === 3 ? (8 + seedY) :
      group === 4 ? (10 + seedY) :
      (4 + seedY);
    const mult = ampScale || 1;
    return { ax: baseAx * mult, ay: baseAy * mult };
  };

  const computeEnterOffset = (id) => {
    const groupNum = parseInt(String(id).split('-')[0], 10) || 1;
    // Story: make group1 enter from a bit further out so it doesn't feel like it "just appears".
    const g1 = isIntro ? 12 : 18;
    const dx = groupNum === 1 ? g1 : groupNum === 2 ? 60 : groupNum === 3 ? 90 : 120; // vw
    const dy = groupNum === 1 ? g1 : groupNum === 2 ? 60 : groupNum === 3 ? 90 : 120; // vh
    switch (id) {
      // Group 1
      case '1-1': return { x: `${dx}vw`,  y: `-${dy}vh` }; // top-right → center
      case '1-2': return { x: `${dx}vw`,  y: `${dy}vh` };  // bottom-right
      case '1-3': return { x: `-${dx}vw`, y: `0` };        // left → right
      case '1-4': return { x: `-${dx}vw`, y: `-${dy}vh` }; // top-left
      case '1-5': return { x: `-${dx}vw`, y: `${dy}vh` };  // bottom-left
      // Group 2
      case '2-1': return { x: `${dx}vw`,  y: `0` };        // right → left
      case '2-2': return { x: `-${dx}vw`, y: `0` };        // left → right
      case '2-3': return { x: `0`,        y: `${dy}vh` };  // bottom → top
      case '2-4': return { x: `-${dx}vw`, y: `-${dy}vh` }; // top-left → bottom-right
      // Group 3
      case '3-1': return { x: `${dx}vw`,  y: `${dy}vh` };  // bottom-right → top-left
      case '3-2': return { x: `${dx}vw`,  y: `-${dy}vh` }; // top-right → bottom-left
      case '3-3': return { x: `-${dx}vw`, y: `-${dy}vh` }; // top-left → bottom-right
      // Group 4
      case '4-1': return { x: `${dx}vw`,  y: `0` };        // right → left
      case '4-2': return { x: `0`,        y: `${dy}vh` };  // bottom → top
      case '4-3': return { x: `-${dx}vw`, y: `-${dy}vh` }; // top-left → bottom-right
      case '4-4': return { x: `${dx}vw`,  y: `0` };        // right → left
      case '4-5': return { x: `${dx}vw`,  y: `${dy}vh` };  // bottom-right → top-left
      default:    return { x: `0`,        y: `40px` };
    }
  };

  return (
    <div
      className={[
        styles.stage,
        styles.stageFadeIn,
        !isIntro ? styles.story : '',
      ].join(' ')}
      aria-hidden
      style={{ ['--stageColor']: stageColor }}
    >
      {waves.map((wave) => {
        const isVisible = visibleIds?.has(wave.id);
        const { durationMs, delayMs } = computeFloat(wave.group, wave.id);
        const reenter = reenterGroups?.has?.(wave.group);
        const softReenter = softReenterGroups?.has?.(wave.group);
        const enter = computeEnterOffset(wave.id);
        const { ax, ay } = computeAmplitude(wave.group, wave.id);
        const invert = (v) => (v === '0' ? '0' : (v.startsWith('-') ? v.slice(1) : `-${v}`));
        const exitXStr = invert(enter.x);
        const exitYStr = invert(enter.y);
        // per-image stagger/duration for organic entrance (story)
        const suf = parseInt(String(wave.id).split('-')[1], 10) || 0;
        // Intro: basically immediate, but with tiny, scrambled offsets so it feels "얼기설기".
        // Story: keep delays small so bursts feel responsive.
        const baseEnterDelay =
          wave.group === 1 ? 0 :
          wave.group === 2 ? 40 :
          wave.group === 3 ? 60 :
          80;
        // Intro timing: organic stagger (non-linear distribution)
        // Most slices start quickly, a few lag more to create an "얼기설기" feel.
        const introMaxDelay =
          wave.group === 1 ? 520 :
          wave.group === 2 ? 580 :
          wave.group === 3 ? 620 :
          680;
        const seed =
          (wave.group * 1337) +
          (suf * 97) +
          (String(wave.id).charCodeAt(0) * 31) +
          (String(wave.id).charCodeAt(2) * 17);
        const r = (Math.abs(Math.sin(seed) * 10000) % 1); // 0..1
        const skew = Math.pow(r, 0.38); // more spread (more visible variety)
        const introJitter = Math.round(skew * introMaxDelay);
        let enterDelay = isIntro
          ? introJitter
          : (baseEnterDelay + ((wave.group * 31 + suf * 47) % 160));

        // Intro: faster overall, but per-slice variability makes it feel alive.
        let introEnterDur =
          wave.group === 1 ? 1050 :
          wave.group === 2 ? 1250 :
          wave.group === 3 ? 1450 :
          1650;
        const durVar = Math.round((Math.abs(Math.sin(seed * 1.7)) * 1000) % 650); // 0..649ms
        introEnterDur += durVar;
        const storyBaseDur =
          wave.group === 1 ? 1700 :
          wave.group === 2 ? 1900 :
          wave.group === 3 ? 2100 :
          2300;
        let storyEnterDur = storyBaseDur + ((wave.group * 37 + suf * 19) % 500); // +0..499ms

        // Exception: 4-5 should be the "virtual timing 5" — unmistakably last + slow (intro + story)
        if (wave.id === '4-5') {
          enterDelay += isIntro ? 1100 : 900;
          introEnterDur += 900;
          storyEnterDur += 900;
        }
        // Intro: start slightly zoomed-in then ease out for more dynamism
        const startScale =
          isIntro
            ? (wave.group === 1 ? 1.06 : wave.group === 2 ? 1.08 : wave.group === 3 ? 1.10 : 1.12)
            : 1.02;
        const endScale = 1.02;
        return (
          <img
            key={wave.id}
            src={wave.src}
            alt=""
            className={[
              styles.wave,
              styles[`layer${wave.group}`],
              isVisible ? styles.visible : '',
              // Only allow reenter animations during intro; in story, rely on translate-only via .story .visible
              reenter && isIntro ? (softReenter ? styles.reenterSoft : styles.reenter) : '',
              !reenter && ((exitGroups && exitGroups.has?.(wave.group)) || (exiting && wave.group !== 1)) ? styles.exit : '',
            ].join(' ')}
            style={{
              zIndex: computeZIndex(wave.group, wave.id),
              ['--floatDur']: `${durationMs}ms`,
              ['--floatDelay']: `${delayMs}ms`,
              ['--exitX']: exitXStr,
              ['--exitY']: exitYStr,
              ['--enterX']: enter.x,
              ['--enterY']: enter.y,
              ['--ampX']: `${ax}px`,
              ['--ampY']: `${ay}px`,
              ['--enterDelay']: `${enterDelay}ms`,
              ['--enterDur']: `${introEnterDur}ms`,
              ['--storyEnterDur']: `${storyEnterDur}ms`,
              ['--startScale']: String(startScale),
              ['--endScale']: String(endScale),
            }}
            decoding="async"
            loading="eager"
          />
        );
      })}
      <div className={styles.dim} style={{ ['--dimOpacity']: dimOverlay }} />
    </div>
  );
}

export default memo(Background);


