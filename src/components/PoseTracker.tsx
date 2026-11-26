import { useEffect, useRef, useState } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

import { tr } from '../i18n.ts';
import type { StringKey } from '../i18n.ts';
import { AudioCoach } from '../lib/audio.ts';
import type { CueId, Lang } from '../lib/audio.ts';
import { asset } from '../lib/assets.ts';
import {
  COUNTDOWN_SECONDS,
  HUD_INTERVAL_MS,
  METRONOME_BPM,
  SESSION_SECONDS,
  TARGET_BPM_MAX,
  TARGET_BPM_MIN,
} from '../lib/config.ts';
import { CprDetector } from '../lib/cprDetector.ts';
import { CsvRecorder } from '../lib/csvRecorder.ts';
import type { RecorderMeta } from '../lib/csvRecorder.ts';
import { chooseSide, classifyByThreshold, computeArmMetrics, isArmVisible, TimeEma } from '../lib/posture.ts';
import type { ArmSide, PostureLabel } from '../lib/posture.ts';
import { getPostureModel, predictPosture } from '../lib/postureModel.ts';
import { SessionScorer } from '../lib/sessionScorer.ts';
import type { SessionSummary } from '../lib/sessionScorer.ts';

import { EmergencyPanel } from './EmergencyPanel.tsx';
import { RecorderPanel } from './RecorderPanel.tsx';
import { SummaryCard } from './SummaryCard.tsx';

type AppMode = 'PRACTICE' | 'EMERGENCY';
type Phase = 'IDLE' | 'COUNTDOWN' | 'ACTIVE';
type RateState = 'WAIT' | 'MEASURING' | 'LOW' | 'OK' | 'HIGH';
type PostureState = 'LOST' | PostureLabel;

interface Hud {
  fps: number;
  tracking: boolean;
  bpm: number | null;
  rate: RateState;
  posture: PostureState;
  elbow: number;
  offset: number;
  phase: Phase;
  secondsLeft: number;
  rows: number;
  taps: number;
}

const INITIAL_HUD: Hud = {
  fps: 0,
  tracking: false,
  bpm: null,
  rate: 'WAIT',
  posture: 'LOST',
  elbow: 0,
  offset: 0,
  phase: 'IDLE',
  secondsLeft: 0,
  rows: 0,
  taps: 0,
};

/** Dữ liệu cập nhật ở tốc độ khung hình, KHÔNG gây render lại React. HUD lấy mẫu từ đây ~8 lần/giây. */
interface Live {
  fps: number;
  tracking: boolean;
  bpm: number | null;
  rate: RateState;
  posture: PostureState;
  elbow: number;
  offset: number;
}

interface SessionRef {
  phase: Phase;
  phaseEndsAt: number;
  startedAt: number;
}

const CUE_COOLDOWN_MS = 3200;
const CUE_TEXT: Record<CueId, StringKey> = {
  faster: 'cueFaster',
  slower: 'cueSlower',
  straighten: 'cueStraighten',
  shoulders: 'cueShoulders',
};

function cameraErrorKey(e: unknown): StringKey {
  const name = e instanceof DOMException ? e.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'errCameraDenied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'errCameraNotFound';
  return 'errCameraOther';
}

interface Props {
  lang: Lang;
}

export function PoseTracker({ lang }: Props) {
  const t = tr(lang);
  const isEn = lang === 'en';

  // ---- DOM / engine objects (ổn định giữa các lần render) ----
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [coach] = useState(() => new AudioCoach());
  const [detector] = useState(() => new CprDetector());
  const [recorder] = useState(() => new CsvRecorder());
  const scorerRef = useRef(new SessionScorer());

  // ---- State hiển thị ----
  const [mode, setMode] = useState<AppMode>('PRACTICE');
  const [engine, setEngine] = useState<{ status: 'LOADING' | 'READY' | 'ERROR'; errorKey: StringKey | null; cpu: boolean }>({
    status: 'LOADING',
    errorKey: null,
    cpu: false,
  });
  const [audioMissing, setAudioMissing] = useState(false);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [recMeta, setRecMeta] = useState<RecorderMeta>({
    subjectId: 'S01',
    label: 'CORRECT_POSTURE',
    cameraAngle: 'SIDE_90',
    lighting: 'BRIGHT',
    device: '',
  });

  // ---- Refs phản chiếu state để vòng lặp khung hình đọc được mà không bị "stale" ----
  const modeRef = useRef(mode);
  const langRef = useRef(lang);
  const showCameraRef = useRef(showCamera);
  const isRecordingRef = useRef(isRecording);
  const recMetaRef = useRef(recMeta);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { showCameraRef.current = showCamera; }, [showCamera]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { recMetaRef.current = recMeta; }, [recMeta]);

  const sessionRef = useRef<SessionRef>({ phase: 'IDLE', phaseEndsAt: 0, startedAt: 0 });
  const liveRef = useRef<Live>({ fps: 0, tracking: false, bpm: null, rate: 'WAIT', posture: 'LOST', elbow: 0, offset: 0 });
  const tapsRef = useRef(0);
  const lastCueAtRef = useRef(0);
  const lastCueByIdRef = useRef<Record<CueId, number>>({ faster: 0, slower: 0, straighten: 0, shoulders: 0 });

  // ---------------------------------------------------------------- âm thanh
  useEffect(() => {
    let cancelled = false;
    void coach.preload(lang).then((r) => {
      if (!cancelled) setAudioMissing(r.missing.length > 0);
    });
    return () => {
      cancelled = true;
    };
  }, [coach, lang]);

  useEffect(() => () => coach.dispose(), [coach]);

  // ---------------------------------------------------------------- điều khiển phiên
  const beginActive = (now: number) => {
    detector.reset();
    scorerRef.current = new SessionScorer();
    lastCueAtRef.current = 0;
    sessionRef.current = { phase: 'ACTIVE', phaseEndsAt: now + SESSION_SECONDS * 1000, startedAt: now };
  };

  const finishSession = (now: number) => {
    const s = sessionRef.current;
    if (s.phase === 'ACTIVE') {
      const elapsed = Math.max(1, Math.min(SESSION_SECONDS, (now - s.startedAt) / 1000));
      setSummary(scorerRef.current.summarize(elapsed));
    }
    sessionRef.current = { phase: 'IDLE', phaseEndsAt: 0, startedAt: 0 };
  };

  const startSession = () => {
    coach.unlock(); // phải gọi ngay trong sự kiện bấm nút (iOS/Safari)
    setSummary(null);
    sessionRef.current = {
      phase: 'COUNTDOWN',
      phaseEndsAt: performance.now() + COUNTDOWN_SECONDS * 1000,
      startedAt: 0,
    };
  };

  const stopSession = () => finishSession(performance.now());

  const switchMode = (m: AppMode) => {
    if (m === mode) return;
    if (sessionRef.current.phase !== 'IDLE') {
      sessionRef.current = { phase: 'IDLE', phaseEndsAt: 0, startedAt: 0 }; // huỷ, không chấm điểm
    }
    if (m === 'EMERGENCY') setIsRecording(false);
    setSummary(null);
    setMode(m);
  };

  const toggleMetronome = () => {
    coach.unlock();
    if (coach.metronomeOn) {
      coach.stopMetronome();
      setMetronomeOn(false);
    } else {
      coach.startMetronome(METRONOME_BPM);
      setMetronomeOn(true);
    }
  };

  // ---------------------------------------------------------------- ghi dữ liệu
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      recorder.start(performance.now());
      tapsRef.current = 0;
      setIsRecording(true);
      (document.activeElement as HTMLElement | null)?.blur(); // để phím Cách không bấm lại nút này
    }
  };

  const tapGroundTruth = () => {
    if (!isRecordingRef.current) return;
    recorder.tap();
    tapsRef.current += 1;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !isRecordingRef.current) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      recorder.tap();
      tapsRef.current += 1;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [recorder]);

  // ---------------------------------------------------------------- HUD (~8 lần/giây) + đồng hồ phiên
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      const s = sessionRef.current;
      if (s.phase === 'COUNTDOWN' && now >= s.phaseEndsAt) beginActive(now);
      else if (s.phase === 'ACTIVE' && now >= s.phaseEndsAt) finishSession(now);

      const cur = sessionRef.current;
      const l = liveRef.current;
      setHud({
        ...l,
        phase: cur.phase,
        secondsLeft: cur.phase === 'IDLE' ? 0 : Math.max(0, Math.ceil((cur.phaseEndsAt - now) / 1000)),
        rows: recorder.count,
        taps: tapsRef.current,
      });
    }, HUD_INTERVAL_MS);
    return () => window.clearInterval(id);
    // beginActive/finishSession chỉ dùng ref và setter ổn định nên không cần đưa vào deps
  }, [recorder, detector]);

  // ---------------------------------------------------------------- vòng lặp AI + camera
  useEffect(() => {
    let cancelled = false;
    let landmarker: PoseLandmarker | null = null;
    let stream: MediaStream | null = null;
    let raf = 0;

    const angleEma = new TimeEma(120);
    const offsetEma = new TimeEma(120);
    let side: ArmSide | null = null;
    let lastVideoTime = -1;
    let lastTs = 0;
    let lastFrameAt = 0;
    let fpsCount = 0;
    let fpsWindowStart = performance.now();
    let drawing: DrawingUtils | null = null;
    let errorStreak = 0;

    const model = getPostureModel();

    const pickCue = (cands: CueId[], now: number) => {
      if (cands.length === 0 || now - lastCueAtRef.current < CUE_COOLDOWN_MS) return;
      let best = cands[0];
      for (const c of cands) if (lastCueByIdRef.current[c] < lastCueByIdRef.current[best]) best = c;
      const text = tr(langRef.current)(CUE_TEXT[best]);
      coach.playCue(best, langRef.current, text);
      lastCueAtRef.current = now;
      lastCueByIdRef.current[best] = now;
    };

    const processFrame = (lm: NormalizedLandmark[], now: number, aspect: number) => {
      const dt = lastFrameAt === 0 ? 0 : now - lastFrameAt;
      lastFrameAt = now;
      const live = liveRef.current;

      side = chooseSide(lm, side);
      const m = computeArmMetrics(lm, aspect, side);

      if (!isArmVisible(m)) {
        detector.notifyLost();
        angleEma.reset();
        offsetEma.reset();
        live.tracking = false;
        live.posture = 'LOST';
        live.rate = 'WAIT';
        live.bpm = null;
        return;
      }

      const angle = angleEma.push(m.elbowAngleDeg, now);
      const offset = offsetEma.push(m.offsetNorm, now);
      live.tracking = true;
      live.elbow = Math.round(angle);
      live.offset = Number(offset.toFixed(2));

      // Tư thế: bộ phân loại đội huấn luyện nếu có, nếu không thì ngưỡng cố định
      const posture: PostureLabel = model ? predictPosture(model, angle, offset).label : classifyByThreshold(angle, offset);
      live.posture = posture;

      // Nhịp
      const out = detector.update(m.wristYNorm, now);
      live.bpm = out.bpm;
      if (!out.compressing) live.rate = 'WAIT';
      else if (out.bpm === null) live.rate = 'MEASURING';
      else if (out.bpm < TARGET_BPM_MIN) live.rate = 'LOW';
      else if (out.bpm > TARGET_BPM_MAX) live.rate = 'HIGH';
      else live.rate = 'OK';

      // Chấm điểm + nhắc giọng nói: chỉ trong phiên đang chạy ở chế độ luyện tập
      const sess = sessionRef.current;
      if (modeRef.current === 'PRACTICE' && sess.phase === 'ACTIVE') {
        if (out.peak) scorerRef.current.addPeak();
        scorerRef.current.addFrame({ dtMs: dt, compressing: out.compressing, bpm: out.bpm, posture });

        if (out.compressing) {
          // Tư thế và nhịp được xét ĐỘC LẬP; cue nào lâu chưa được nhắc nhất sẽ được phát trước,
          // nên người ép sai tư thế vẫn nghe nhắc về nhịp (lỗi cũ: nhịp chỉ nhắc khi tư thế đúng).
          const cands: CueId[] = [];
          if (posture === 'BENT_ELBOW') cands.push('straighten');
          else if (posture === 'OFF_AXIS') cands.push('shoulders');
          if (live.rate === 'LOW') cands.push('faster');
          else if (live.rate === 'HIGH') cands.push('slower');
          pickCue(cands, now);
        }
      }

      if (isRecordingRef.current) {
        recorder.push(now, recMetaRef.current, {
          elbowAngleDeg: m.elbowAngleDeg,
          offsetNorm: m.offsetNorm,
          wristYNorm: m.wristYNorm,
          wristYSmooth: out.smoothed,
          armVisibility: m.visibility,
          fps: live.fps,
          isCompressing: out.compressing,
          detectedPeak: out.peak,
        });
      }
    };

    let halted = false;
    const loop = () => {
      if (halted) return;
      raf = requestAnimationFrame(loop);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !landmarker || video.readyState < 2 || video.videoWidth === 0) return;
      // Chỉ xử lý khi có khung hình video mới (rAF có thể chạy nhanh hơn camera)
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      const now = performance.now();
      const ts = Math.max(now, lastTs + 1); // detectForVideo yêu cầu timestamp tăng nghiêm ngặt
      lastTs = ts;

      fpsCount += 1;
      if (now - fpsWindowStart >= 1000) {
        liveRef.current.fps = Math.round((fpsCount * 1000) / (now - fpsWindowStart));
        fpsCount = 0;
        fpsWindowStart = now;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        drawing = null;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (!drawing) drawing = new DrawingUtils(ctx);

      let results;
      try {
        results = landmarker.detectForVideo(video, ts);
        errorStreak = 0;
      } catch {
        errorStreak += 1;
        if (errorStreak === 30) {
          halted = true;
          cancelAnimationFrame(raf);
          setEngine({ status: 'ERROR', errorKey: 'errModel', cpu: false });
        }
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (showCameraRef.current) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // khung căn chỉnh
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.strokeRect(canvas.width * 0.15, canvas.height * 0.1, canvas.width * 0.7, canvas.height * 0.85);
      ctx.setLineDash([]);

      const lm = results.landmarks?.[0];
      if (lm) {
        drawing.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: '#22C55E', lineWidth: 3 });
        drawing.drawLandmarks(lm, { color: '#EF4444', lineWidth: 1, radius: 4 });
        processFrame(lm, now, video.videoWidth / video.videoHeight);
      } else {
        detector.notifyLost();
        const live = liveRef.current;
        live.tracking = false;
        live.posture = 'LOST';
        live.rate = 'WAIT';
        live.bpm = null;
      }
    };

    const init = async () => {
      // 1) Mô hình: thử GPU, nếu lỗi thì CPU (lỗi cũ: GPU hỏng bị báo thành "không tìm thấy model")
      let cpu = false;
      try {
        const vision = await FilesetResolver.forVisionTasks(asset('mediapipe/wasm'));
        const create = (delegate: 'GPU' | 'CPU') =>
          PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: asset('mediapipe/pose_landmarker_lite.task'), delegate },
            runningMode: 'VIDEO',
            numPoses: 1,
          });
        try {
          landmarker = await create('GPU');
        } catch {
          landmarker = await create('CPU');
          cpu = true;
        }
      } catch {
        if (!cancelled) setEngine({ status: 'ERROR', errorKey: 'errModel', cpu: false });
        return;
      }
      if (cancelled) {
        landmarker?.close();
        landmarker = null;
        return;
      }

      // 2) Camera: báo lỗi riêng, không gộp với lỗi model
      if (!navigator.mediaDevices?.getUserMedia) {
        setEngine({ status: 'ERROR', errorKey: 'errCameraInsecure', cpu });
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
      } catch (e) {
        if (!cancelled) setEngine({ status: 'ERROR', errorKey: cameraErrorKey(e), cpu });
        return;
      }
      if (cancelled) {
        stream?.getTracks().forEach((tk) => tk.stop());
        stream = null;
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        /* một số trình duyệt ném lỗi khi bị gián đoạn; vòng lặp vẫn chờ readyState */
      }
      if (cancelled) return;
      setEngine({ status: 'READY', errorKey: null, cpu });
      raf = requestAnimationFrame(loop);
    };

    void init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tk) => tk.stop());
      const v = videoRef.current;
      if (v) v.srcObject = null;
      landmarker?.close();
      landmarker = null;
    };
  }, [coach, detector, recorder]);

  // ---------------------------------------------------------------- ghi hình & xem lại video
  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  const startVideoRecording = () => {
    // Ghi hình từ camera gốc (nhẹ máy). Nếu muốn ghi DÍNH CẢ KHUNG XƯƠNG AI, đổi dòng dưới thành:
    // const stream = canvasRef.current?.captureStream(30);
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;

    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }

    recordedChunksRef.current = [];
    const mimeType = getSupportedMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    rec.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType || 'video/webm' });
      setRecordedUrl(URL.createObjectURL(blob));
    };

    rec.start();
    mediaRecorderRef.current = rec;
    setIsVideoRecording(true);
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isVideoRecording) {
      mediaRecorderRef.current.stop();
      setIsVideoRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);
  
  // ---------------------------------------------------------------- hiển thị
  const practice = mode === 'PRACTICE';
  const usingModel = getPostureModel() !== null;

  const rateText: Record<RateState, StringKey> = {
    WAIT: 'fbWaiting',
    MEASURING: 'fbMeasuring',
    LOW: 'fbRateLow',
    OK: 'fbRateOk',
    HIGH: 'fbRateHigh',
  };
  const postureText = (p: PostureState): StringKey | null => {
    if (p === 'LOST') return 'fbNoArm';
    if (p === 'BENT_ELBOW') return 'fbBent';
    if (p === 'OFF_AXIS') return 'fbOffAxis';
    return 'fbPostureOk';
  };
  const rateClass = hud.rate === 'OK' ? 'good' : hud.rate === 'LOW' || hud.rate === 'HIGH' ? 'warn' : 'idle';
  const postureClass = hud.posture === 'CORRECT_POSTURE' ? 'good' : hud.posture === 'LOST' ? 'idle' : 'warn';
  const pText = postureText(hud.posture);

  // Trạng thái viền camera phát sáng theo tư thế / nhịp
  const stageStatus = !hud.tracking
    ? ''
    : postureClass === 'warn' || rateClass === 'warn'
      ? 'stage-warn'
      : 'stage-good';

  // Tính vị trí thanh đo nhịp BPM (thang đo 60 -> 160 BPM)
  const GAUGE_MIN = 60;
  const GAUGE_MAX = 160;
  const gaugeSpan = GAUGE_MAX - GAUGE_MIN;
  const targetLeftPct = ((TARGET_BPM_MIN - GAUGE_MIN) / gaugeSpan) * 100;
  const targetWidthPct = ((TARGET_BPM_MAX - TARGET_BPM_MIN) / gaugeSpan) * 100;
  const bpmPct =
    hud.bpm !== null ? Math.max(0, Math.min(100, ((hud.bpm - GAUGE_MIN) / gaugeSpan) * 100)) : null;

  // Badge trạng thái AI ở góc trên bên trái camera
  const badgeState =
    engine.status === 'ERROR'
      ? 'error'
      : engine.status === 'LOADING'
        ? 'loading'
        : hud.tracking
          ? 'tracking'
          : 'ready';
  const badgeLabel =
    engine.status === 'ERROR'
      ? 'AI ERROR'
      : engine.status === 'LOADING'
        ? 'LOADING AI...'
        : hud.tracking
          ? `AI TRACKING · ${engine.cpu ? 'CPU' : 'GPU'}`
          : `AI READY · ${engine.cpu ? 'CPU' : 'GPU'}`;

  return (
    <div className="tracker">
      <div className="mode-switch" role="tablist">
        <button type="button" role="tab" aria-selected={practice} className={practice ? 'active practice' : ''} onClick={() => switchMode('PRACTICE')}>
          {t('modePractice')}
        </button>
        <button type="button" role="tab" aria-selected={!practice} className={!practice ? 'active emergency' : ''} onClick={() => switchMode('EMERGENCY')}>
          {t('modeEmergency')}
        </button>
      </div>

      {!practice && <EmergencyPanel t={t} metronomeOn={metronomeOn} onToggleMetronome={toggleMetronome} />}

      {practice && (
        <div className="session-bar">
          {hud.phase === 'IDLE' ? (
            <button type="button" className="btn-primary" onClick={startSession} disabled={engine.status !== 'READY'}>
              {t('startSession')}
            </button>
          ) : (
            <button type="button" className="btn-warn" onClick={stopSession}>
              {t('stopEarly')} ({hud.secondsLeft}s)
            </button>
          )}
          <button type="button" className={`btn-secondary ${metronomeOn ? 'on' : ''}`} onClick={toggleMetronome}>
            {metronomeOn ? `■ ${t('metronomeOff')}` : `▶ ${t('metronomeOn')}`}
          </button>
          <button
            type="button"
            className={`btn-secondary ${showGuide ? 'on' : ''}`}
            onClick={() => setShowGuide((v) => !v)}
          >
            {showGuide
              ? (isEn ? '✕ Hide guide' : '✕ Ẩn hướng dẫn')
              : (isEn ? '▶ Video guide' : '▶ Video hướng dẫn')}
          </button>
          <label className="check">
            <input type="checkbox" checked={showCamera} onChange={(e) => setShowCamera(e.target.checked)} />
            {t('showCamera')}
          </label>
        </div>
      )}

      {practice && summary && <SummaryCard t={t} s={summary} />}
      {practice && showGuide && (
        <div className="guide-panel">
          <div className="guide-header">
            <h4>{isEn ? 'Posture & camera setup guide' : 'Hướng dẫn tư thế & đặt camera'}</h4>
            <button type="button" className="btn-close-guide" onClick={() => setShowGuide(false)}>
              {isEn ? '✕ Close' : '✕ Đóng'}
            </button>
          </div>
          <video
            src={asset('cpr-guide.mp4')}
            controls
            playsInline
            className="guide-video"
          />
          {isEn ? (
            <ul className="guide-tips">
              <li><strong>Hand placement:</strong> Place the heel of one hand in the center of the chest (lower half of the breastbone), with your other hand interlocked on top.</li>
              <li><strong>Posture:</strong> Keep your elbows locked straight and your shoulders positioned directly over your hands.</li>
              <li><strong>Camera angle:</strong> Position the camera at a 90° side profile for the most accurate AI arm tracking.</li>
            </ul>
          ) : (
            <ul className="guide-tips">
              <li><strong>Đặt tay:</strong> Gót bàn tay ở giữa ngực (1/2 dưới xương ức), đan hai tay vào nhau.</li>
              <li><strong>Tư thế:</strong> Duỗi thẳng khuỷu tay, vai vuông góc thẳng trục với bàn tay.</li>
              <li><strong>Góc camera:</strong> Đặt camera nhìn nghiêng 90° bên hông để AI nhận diện cánh tay chính xác nhất.</li>
            </ul>
          )}
        </div>
      )}

      {engine.errorKey && <div className="banner error">{t(engine.errorKey)}</div>}
      {engine.cpu && <div className="banner note">{t('noteCpuFallback')}</div>}
      {audioMissing && <div className="banner note">{t('warnAudioMissing')}</div>}
      {engine.status === 'READY' && hud.fps > 0 && hud.fps < 15 && <div className="banner note">{t('warnLowFps')}</div>}

      <div className={`stage ${stageStatus}`}>
        <div className={`stage-badge ${badgeState}`}>
          <span className="badge-dot" />
          {badgeLabel}
        </div>
        {engine.status === 'LOADING' && <div className="stage-loading">{t('loadingModel')}</div>}
        <canvas ref={canvasRef} className="stage-canvas" />
        <video ref={videoRef} className="stage-video" playsInline muted />
        {hud.phase === 'COUNTDOWN' && (
          <div className="stage-count" aria-live="assertive">
            <span>{hud.secondsLeft}</span>
            <small>{t('getReady')}</small>
          </div>
        )}
        {hud.phase === 'ACTIVE' && (
          <div className="stage-timer">
            {t('timeLeft')}: <strong>{hud.secondsLeft}s</strong>
          </div>
        )}
      </div>
      <div className="video-record-bar">
        {!isVideoRecording ? (
          <button
            type="button"
            className="btn-record"
            onClick={startVideoRecording}
            disabled={engine.status !== 'READY'}
          >
            {isEn ? '● Record video' : '● Bắt đầu ghi hình'}
          </button>
        ) : (
          <button type="button" className="btn-stop" onClick={stopVideoRecording}>
            {isEn ? '■ Stop & Review' : '■ Dừng & Xem lại'}
          </button>
        )}
      </div>

      {recordedUrl && (
        <div className="replay-section">
          <h4>{isEn ? 'Recorded practice' : 'Video vừa tập'}</h4>
          <video src={recordedUrl} controls className="replay-video" />
          <div className="replay-actions">
            <a href={recordedUrl} download={`cpr-practice-${Date.now()}.webm`} className="btn-download">
              {isEn ? 'Download video' : 'Tải video về máy'}
            </a>
            <button
              type="button"
              className="btn-clear"
              onClick={() => {
                URL.revokeObjectURL(recordedUrl);
                setRecordedUrl(null);
              }}
            >
              {isEn ? 'Delete video' : 'Xóa video'}
            </button>
          </div>
        </div>
      )}

      <div className="hud">
        <div className="hud-metrics">
          <div className="metric">
            <span className="metric-label">{t('hudRate')}</span>
            <span className={`metric-value big ${rateClass}`}>
              {hud.bpm ?? '—'} <small>{t('hudBpmUnit')}</small>
            </span>
            <span className="metric-sub">
              {t('hudTarget')}: {TARGET_BPM_MIN}–{TARGET_BPM_MAX}
            </span>
          </div>
          {practice && (
            <>
              <div className="metric">
                <span className="metric-label">{t('hudElbow')}</span>
                <span className={`metric-value ${hud.posture === 'BENT_ELBOW' ? 'warn' : 'good'}`}>{hud.tracking ? `${hud.elbow}°` : '—'}</span>
              </div>
              <div className="metric">
                <span className="metric-label">{t('hudOffset')}</span>
                <span className={`metric-value ${hud.posture === 'OFF_AXIS' ? 'warn' : 'good'}`}>{hud.tracking ? hud.offset : '—'}</span>
              </div>
            </>
          )}
          <div className="metric">
            <span className="metric-label">FPS</span>
            <span className="metric-value">{hud.fps}</span>
          </div>
        </div>

        {/* Thanh đo nhịp BPM trực quan (Live BPM Gauge) */}
        <div className="bpm-gauge" aria-label="Live BPM Gauge">
          <div className="bpm-track">
            <div
              className="bpm-target"
              style={{ left: `${targetLeftPct}%`, width: `${targetWidthPct}%` }}
            />
            {bpmPct !== null && (
              <div className={`bpm-needle ${rateClass}`} style={{ left: `${bpmPct}%` }} />
            )}
          </div>
          <div className="bpm-ticks">
            <span>{GAUGE_MIN}</span>
            <span className="bpm-tick-target">{TARGET_BPM_MIN}–{TARGET_BPM_MAX} BPM</span>
            <span>{GAUGE_MAX}</span>
          </div>
        </div>

        <div className="hud-feedback">
          <div className={`fb ${rateClass}`}>
            <span className="fb-tag">{t('lblRate')}</span>
            {t(rateText[hud.rate])}
          </div>
          {practice && pText && (
            <div className={`fb ${postureClass}`}>
              <span className="fb-tag">{t('lblPosture')}</span>
              {t(pText)}
            </div>
          )}
        </div>
        {practice && <div className="hud-source">{usingModel ? t('hudClassifierModel') : t('hudClassifierThreshold')}</div>}
      </div>

      {practice && (
        <RecorderPanel
          t={t}
          meta={recMeta}
          onMeta={setRecMeta}
          isRecording={isRecording}
          rows={hud.rows}
          taps={hud.taps}
          onToggle={toggleRecording}
          onTap={tapGroundTruth}
          onDownload={() => recorder.download(recMeta.subjectId)}
          onClear={() => recorder.clear()}
        />
      )}

      <p className="limits">{t('limits')}</p>
    </div>
  );
}

export default PoseTracker;
