import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import * as THREE from 'three';
import type { Lang } from '../lib/audio';
import { tr } from '../i18n.ts';
import {
  IconMinimize,
  IconPlay,
  IconStop,
  IconVolume,
  IconVolumeOff,
} from './Icons.tsx';
import {
  COACH_ACCENT_COLORS,
  COACH_CUES,
  CoachAudioController,
  type CoachState,
} from '../lib/coachAudio';

interface CoachAvatarProps {
  state: CoachState;
  lang?: Lang;
  bpm?: number | null;
  disableAutoSpeech?: boolean;
  externalSpeaking?: boolean;
  showDebugControls?: boolean;
}

const DEBUG_LABELS: Record<Lang, Record<CoachState, string>> = {
  vi: {
    idle: 'Chờ',
    demo: 'Mẫu',
    good: 'Tốt',
    fix_elbow: 'Thẳng tay',
    too_slow: 'Chậm',
    too_fast: 'Nhanh',
  },
  en: {
    idle: 'Idle',
    demo: 'Demo',
    good: 'Good',
    fix_elbow: 'Elbow',
    too_slow: 'Slow',
    too_fast: 'Fast',
  },
};

export function CoachAvatar({
  state,
  lang = 'vi',
  bpm = null,
  disableAutoSpeech = false,
  externalSpeaking = false,
  showDebugControls = false,
}: CoachAvatarProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<CoachAudioController | null>(null);

  const [muted, setMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [manualOverride, setManualOverride] = useState<CoachState | null>(null);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );

  const activeState: CoachState = manualOverride ?? state;
  const activeStateRef = useRef<CoachState>(activeState);
  const speakingRef = useRef<boolean>(false);
  const effectiveSpeaking = isSpeaking || externalSpeaking;

  useEffect(() => {
    setManualOverride(null);
  }, [state]);

  useEffect(() => {
    activeStateRef.current = activeState;
  }, [activeState]);

  useEffect(() => {
    speakingRef.current = effectiveSpeaking;
  }, [effectiveSpeaking]);

  useEffect(() => {
    const controller = new CoachAudioController((speaking) => {
      setIsSpeaking(speaking);
    });
    audioRef.current = controller;
    return () => {
      controller.dispose();
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (activeState === 'idle') return;
    if (disableAutoSpeech && !manualOverride) return;
    audioRef.current?.speak(activeState, lang, manualOverride === 'demo');
  }, [activeState, lang, manualOverride, disableAutoSpeech]);

  useEffect(() => {
    if (collapsed) return;
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 260;
    const height = container.clientHeight || 210;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, 1.45, 4.3);
    camera.lookAt(0, 1.05, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 1.15);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.1,
    });
    const tealMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.35,
      metalness: 0.2,
    });
    const darkVisorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.15,
      metalness: 0.4,
    });
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.35,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const robotRoot = new THREE.Group();
    scene.add(robotRoot);

    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.85, 0);
    robotRoot.add(torsoGroup);

    const torsoMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.36, 0.85, 24),
      whiteMat
    );
    torsoGroup.add(torsoMesh);

    const beltMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.37, 0.14, 24),
      tealMat
    );
    beltMesh.position.y = -0.28;
    torsoGroup.add(beltMesh);

    const crossV = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.24, 0.04),
      redMat
    );
    crossV.position.set(0, 0.08, 0.41);
    const crossH = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.04),
      redMat
    );
    crossH.position.set(0, 0.08, 0.41);
    torsoGroup.add(crossV, crossH);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, 0);
    torsoGroup.add(headGroup);

    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 28, 24),
      whiteMat
    );
    headMesh.scale.set(1.05, 0.92, 0.96);
    headGroup.add(headMesh);

    const earGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16);
    const leftEar = new THREE.Mesh(earGeo, tealMat);
    leftEar.rotation.z = Math.PI / 2;
    leftEar.position.set(-0.48, 0.02, 0);
    const rightEar = new THREE.Mesh(earGeo, tealMat);
    rightEar.rotation.z = Math.PI / 2;
    rightEar.position.set(0.48, 0.02, 0);
    headGroup.add(leftEar, rightEar);

    const antennaStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8),
      tealMat
    );
    antennaStem.position.set(0, 0.48, 0);
    const antennaTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      eyeMat
    );
    antennaTip.position.set(0, 0.61, 0);
    headGroup.add(antennaStem, antennaTip);

    const visorMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.39, 24, 20),
      darkVisorMat
    );
    visorMesh.scale.set(1.02, 0.68, 0.52);
    visorMesh.position.set(0, 0.0, 0.26);
    headGroup.add(visorMesh);

    const eyeGeo = new THREE.SphereGeometry(0.068, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 0.05, 0.44);
    leftEye.scale.set(1, 1.15, 0.4);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.15, 0.05, 0.44);
    rightEye.scale.set(1, 1.15, 0.4);
    headGroup.add(leftEye, rightEye);

    const mouthMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.035, 0.03),
      mouthMat
    );
    mouthMesh.position.set(0, -0.1, 0.45);
    headGroup.add(mouthMesh);

    const createArm = (side: -1 | 1) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.5, 0.3, 0);

      const joint = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 14, 14),
        tealMat
      );
      shoulder.add(joint);

      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.075, 0.42, 14),
        whiteMat
      );
      upperArm.position.y = -0.22;
      shoulder.add(upperArm);

      const elbow = new THREE.Group();
      elbow.position.set(0, -0.44, 0);
      shoulder.add(elbow);

      const elbowJoint = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        tealMat
      );
      elbow.add(elbowJoint);

      const foreArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.065, 0.38, 14),
        whiteMat
      );
      foreArm.position.y = -0.2;
      elbow.add(foreArm);

      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 14, 14),
        tealMat
      );
      hand.position.y = -0.42;
      elbow.add(hand);

      torsoGroup.add(shoulder);
      return { shoulder, elbow };
    };

    const leftArm = createArm(-1);
    const rightArm = createArm(1);

    const manikinGroup = new THREE.Group();
    manikinGroup.position.set(0, 0.08, 0.62);

    const chestPad = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.24, 0.65),
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.6,
      })
    );
    const targetRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.025, 12, 24),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    targetRing.rotation.x = Math.PI / 2;
    targetRing.position.set(0, 0.13, 0);
    manikinGroup.add(chestPad, targetRing);
    manikinGroup.scale.set(0.001, 0.001, 0.001);
    scene.add(manikinGroup);

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const current = activeStateRef.current;
      const speaking = speakingRef.current;

      const targetColor = new THREE.Color(
        COACH_ACCENT_COLORS[current] ?? '#38bdf8'
      );
      eyeMat.color.lerp(targetColor, 0.12);
      mouthMat.color.lerp(targetColor, 0.12);

      const blinkCycle = t % 4.2;
      const isBlinking = blinkCycle > 4.05;
      const baseEyeY = current === 'good' ? 0.45 : 1.15;
      const targetEyeY = isBlinking ? 0.1 : baseEyeY;
      leftEye.scale.y = THREE.MathUtils.lerp(leftEye.scale.y, targetEyeY, 0.35);
      rightEye.scale.y = THREE.MathUtils.lerp(
        rightEye.scale.y,
        targetEyeY,
        0.35
      );

      const mouthTargetY = speaking
        ? 1.1 + Math.abs(Math.sin(t * 22)) * 2.4
        : 0.7;
      mouthMesh.scale.y = THREE.MathUtils.lerp(
        mouthMesh.scale.y,
        mouthTargetY,
        0.35
      );

      let torsoY = 0.85 + Math.sin(t * 2.5) * 0.03;
      let torsoRotX = 0;
      let headRotZ = 0;
      let headRotY = Math.sin(t * 1.2) * 0.08;
      let lShoulderX = 0;
      let lShoulderZ = 0.18;
      let lElbowX = -0.2;
      let rShoulderX = 0;
      let rShoulderZ = -0.18;
      let rElbowX = -0.2;
      let showPad = false;
      let padCompressY = 1;

      if (current === 'idle') {
        rShoulderZ = -2.4 + Math.sin(t * 6) * 0.35;
        rElbowX = -0.45;
      } else if (current === 'demo') {
        showPad = true;
        const omega = (110 / 60) * Math.PI * 2;
        const press = (Math.sin(t * omega) + 1) * 0.5;
        torsoY = 0.92 - press * 0.18;
        torsoRotX = 0.38 + press * 0.14;
        headRotY = 0;
        lShoulderX = -1.05 - press * 0.08;
        lShoulderZ = -0.34;
        lElbowX = 0;
        rShoulderX = -1.05 - press * 0.08;
        rShoulderZ = 0.34;
        rElbowX = 0;
        padCompressY = 1 - press * 0.28;
      } else if (current === 'good') {
        torsoY = 0.88 + Math.abs(Math.sin(t * 7)) * 0.1;
        lShoulderZ = 2.5 - Math.sin(t * 8) * 0.2;
        rShoulderZ = -2.5 + Math.sin(t * 8) * 0.2;
        lElbowX = -0.3;
        rElbowX = -0.3;
      } else if (current === 'fix_elbow') {
        headRotZ = Math.sin(t * 4) * 0.15;
        const pulse = Math.sin(t * 6) * 0.1;
        lShoulderX = -1.45 + pulse;
        rShoulderX = -1.45 + pulse;
        lShoulderZ = 0.12;
        rShoulderZ = -0.12;
        lElbowX = 0;
        rElbowX = 0;
      } else if (current === 'too_slow') {
        const wave = Math.sin(t * 11) * 0.45;
        lShoulderX = -1.1 + wave;
        rShoulderX = -1.1 + wave;
        lElbowX = -0.8;
        rElbowX = -0.8;
      } else if (current === 'too_fast') {
        const calm = Math.sin(t * 3.5) * 0.28;
        lShoulderX = -1.0 + calm;
        rShoulderX = -1.0 + calm;
        lShoulderZ = 0.3;
        rShoulderZ = -0.3;
        lElbowX = -0.5;
        rElbowX = -0.5;
      }

      const lerpFactor = current === 'demo' ? 0.35 : 0.14;
      torsoGroup.position.y = THREE.MathUtils.lerp(
        torsoGroup.position.y,
        torsoY,
        lerpFactor
      );
      torsoGroup.rotation.x = THREE.MathUtils.lerp(
        torsoGroup.rotation.x,
        torsoRotX,
        lerpFactor
      );
      headGroup.rotation.z = THREE.MathUtils.lerp(
        headGroup.rotation.z,
        headRotZ,
        0.14
      );
      headGroup.rotation.y = THREE.MathUtils.lerp(
        headGroup.rotation.y,
        headRotY,
        0.14
      );
      leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
        leftArm.shoulder.rotation.x,
        lShoulderX,
        lerpFactor
      );
      leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(
        leftArm.shoulder.rotation.z,
        lShoulderZ,
        lerpFactor
      );
      leftArm.elbow.rotation.x = THREE.MathUtils.lerp(
        leftArm.elbow.rotation.x,
        lElbowX,
        lerpFactor
      );
      rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
        rightArm.shoulder.rotation.x,
        rShoulderX,
        lerpFactor
      );
      rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
        rightArm.shoulder.rotation.z,
        rShoulderZ,
        lerpFactor
      );
      rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
        rightArm.elbow.rotation.x,
        rElbowX,
        lerpFactor
      );

      const targetPadScale = showPad ? 1 : 0.001;
      manikinGroup.scale.x = THREE.MathUtils.lerp(
        manikinGroup.scale.x,
        targetPadScale,
        0.15
      );
      manikinGroup.scale.z = THREE.MathUtils.lerp(
        manikinGroup.scale.z,
        targetPadScale,
        0.15
      );
      manikinGroup.scale.y = THREE.MathUtils.lerp(
        manikinGroup.scale.y,
        showPad ? padCompressY : 0.001,
        0.35
      );

      renderer.render(scene, camera);
    };

    animate();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w === 0 || h === 0) return;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
          })
        : null;
    resizeObserver?.observe(container);

    return () => {
      resizeObserver?.disconnect();
      cancelAnimationFrame(frameId);
      renderer.dispose();
      whiteMat.dispose();
      tealMat.dispose();
      darkVisorMat.dispose();
      redMat.dispose();
      eyeMat.dispose();
      mouthMat.dispose();
    };
  }, [collapsed]);

  const t = tr(lang);
  const accentColor = COACH_ACCENT_COLORS[activeState] ?? '#38bdf8';
  const cue =
    COACH_CUES[lang]?.[activeState] ??
    COACH_CUES.vi[activeState] ??
    COACH_CUES.vi.idle;
  const accentStyle = { '--coach-accent': accentColor } as CSSProperties;
  const showRate = bpm !== null && bpm > 0;

  if (collapsed) {
    return (
      <button
        type="button"
        className="coach-collapsed"
        style={accentStyle}
        onClick={() => setCollapsed(false)}
        aria-label={t('coachExpand')}
      >
        <span className={`coach-dot ${effectiveSpeaking ? 'speaking' : ''}`} aria-hidden="true" />
        <span className="coach-collapsed-label">
          {t('coachTitle')} · {cue.badge}
        </span>
        {showRate && (
          <span className="coach-collapsed-bpm num">{Math.round(bpm)} BPM</span>
        )}
      </button>
    );
  }

  return (
    <section className="coach" style={accentStyle} aria-label={t('coachTitle')}>
      <header className="coach-head">
        <span className="coach-title">
          <span className={`coach-dot ${effectiveSpeaking ? 'speaking' : ''}`} aria-hidden="true" />
          <span className="coach-name">{t('coachTitle')}</span>
          <span className="coach-badge">{cue.badge}</span>
        </span>
        <div className="coach-tools">
          <button
            type="button"
            className="btn-icon"
            onClick={() => setMuted((prev) => !prev)}
            title={muted ? t('coachUnmute') : t('coachMute')}
            aria-label={muted ? t('coachUnmute') : t('coachMute')}
            aria-pressed={muted}
          >
            {muted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setCollapsed(true)}
            title={t('coachMinimize')}
            aria-label={t('coachMinimize')}
          >
            <IconMinimize size={16} />
          </button>
        </div>
      </header>

      <div className="coach-stage">
        <div ref={mountRef} className="coach-canvas" />
      </div>

      <div className={`coach-bubble ${effectiveSpeaking ? 'speaking' : ''}`} aria-live="polite">
        {effectiveSpeaking && (
          <span className="coach-wave" aria-label={t('coachSpeaking')}>
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
        )}
        <p className="coach-text">{cue.text}</p>
        {showRate && activeState !== 'demo' && (
          <p className="coach-rate">
            {t('coachCurrentRate')}: <strong className="num">{Math.round(bpm)} BPM</strong>
          </p>
        )}
      </div>

      <div className="coach-actions">
        <button
          type="button"
          className={`btn btn-block ${activeState === 'demo' ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => {
            if (activeState === 'demo') {
              setManualOverride(state === 'demo' ? 'idle' : null);
            } else {
              setManualOverride('demo');
            }
          }}
        >
          {activeState === 'demo' ? <IconStop size={16} /> : <IconPlay size={16} />}
          {activeState === 'demo' ? t('coachStopDemo') : t('coachDemo')}
        </button>
      </div>

      {showDebugControls && (
        <div className="coach-debug">
          {(
            [
              'idle',
              'demo',
              'good',
              'fix_elbow',
              'too_slow',
              'too_fast',
            ] as CoachState[]
          ).map((s) => (
            <button
              key={s}
              type="button"
              className={activeState === s ? 'active' : ''}
              onClick={() => setManualOverride(s)}
            >
              {DEBUG_LABELS[lang]?.[s] ?? s}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

