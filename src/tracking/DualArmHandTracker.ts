import * as THREE from 'three';
import {
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
  type NormalizedLandmark,
  type Landmark,
} from '@mediapipe/tasks-vision';
import type { ArmHandFrame, Side, TrackResult } from './types';

function createEmptyFrame(side: Side): ArmHandFrame {
  return {
    side,
    active: false,
    hasHand: false,
    shoulder: new THREE.Vector3(),
    elbow: new THREE.Vector3(),
    wrist: new THREE.Vector3(),
    hand: Array.from({ length: 21 }, () => new THREE.Vector3()),
    palm: {
      right: new THREE.Vector3(1, 0, 0),
      up: new THREE.Vector3(0, 1, 0),
      normal: new THREE.Vector3(0, 0, 1),
    },
    scale: 1,
    handScale: 1,
  };
}

export class DualArmHandTracker {
  private poseLandmarker: PoseLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;

  private readonly frames: [ArmHandFrame, ArmHandFrame] = [
    createEmptyFrame('left'),
    createEmptyFrame('right'),
  ];
  private readonly initialized = new Set<string>();
  private readonly alpha = 0.48;

  private readonly tmpVec = new THREE.Vector3();
  private readonly tmpOffset = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3();
  private readonly tmpAcross = new THREE.Vector3();

  async init(asset: (path: string) => string): Promise<{ cpu: boolean }> {
    const vision = await FilesetResolver.forVisionTasks(asset('mediapipe/wasm'));
    let cpu = false;

    const createPose = (modelFile: string, delegate: 'GPU' | 'CPU') =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: asset(`mediapipe/${modelFile}`), delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.6,
        minPosePresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

    const createHand = (delegate: 'GPU' | 'CPU') =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: asset('mediapipe/hand_landmarker.task'), delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

    try {
      this.poseLandmarker = await createPose('pose_landmarker_full.task', 'GPU');
    } catch {
      try {
        this.poseLandmarker = await createPose('pose_landmarker_full.task', 'CPU');
        cpu = true;
      } catch {
        try {
          this.poseLandmarker = await createPose('pose_landmarker_lite.task', 'GPU');
        } catch {
          this.poseLandmarker = await createPose('pose_landmarker_lite.task', 'CPU');
          cpu = true;
        }
      }
    }

    try {
      this.handLandmarker = await createHand('GPU');
    } catch {
      this.handLandmarker = await createHand('CPU');
      cpu = true;
    }

    return { cpu };
  }

  private smoothTo(key: string, target: THREE.Vector3, out: THREE.Vector3): void {
    if (!this.initialized.has(key)) {
      out.copy(target);
      this.initialized.add(key);
    } else {
      out.lerp(target, this.alpha);
    }
  }

  private resetKeys(prefix: string): void {
    for (const k of this.initialized) {
      if (k.startsWith(prefix)) this.initialized.delete(k);
    }
  }

  private toSceneXY(lm: NormalizedLandmark, aspect: number, out: THREE.Vector3): THREE.Vector3 {
    return out.set((lm.x - 0.5) * 2 * aspect, -(lm.y - 0.5) * 2, 0);
  }

  private worldToSceneDir(a: Landmark, b: Landmark, out: THREE.Vector3): THREE.Vector3 {
    return out.set(b.x - a.x, -(b.y - a.y), -(b.z - a.z));
  }

  public processVideoFrame(video: HTMLVideoElement, nowMs: number): TrackResult | null {
    if (!this.poseLandmarker || !this.handLandmarker) return null;
    if (video.readyState < 2 || video.currentTime === this.lastVideoTime) return null;
    this.lastVideoTime = video.currentTime;

    const aspect = (video.videoWidth || 1280) / (video.videoHeight || 720);
    const poseRes = this.poseLandmarker.detectForVideo(video, nowMs);
    const handRes = this.handLandmarker.detectForVideo(video, nowMs);

    const pose = poseRes.landmarks[0] ?? null;
    const poseWorld = poseRes.worldLandmarks?.[0] ?? null;

    if (!pose) {
      this.frames[0].active = false;
      this.frames[1].active = false;
      this.initialized.clear();
      return { poseLandmarks: null, frames: this.frames };
    }

    const configs: Array<{ idx: 0 | 1; side: Side; s: number; e: number; w: number }> = [
      { idx: 0, side: 'left', s: 11, e: 13, w: 15 },
      { idx: 1, side: 'right', s: 12, e: 14, w: 16 },
    ];

    const usedHands = new Set<number>();

    for (const cfg of configs) {
      const frame = this.frames[cfg.idx];
      const lmS = pose[cfg.s];
      const lmE = pose[cfg.e];
      const lmW = pose[cfg.w];

      const visible =
        (lmS.visibility ?? 1) > 0.35 &&
        (lmE.visibility ?? 1) > 0.35 &&
        (lmW.visibility ?? 1) > 0.35;

      if (!visible) {
        frame.active = false;
        frame.hasHand = false;
        this.resetKeys(`${cfg.side}_`);
        continue;
      }

      frame.active = true;

      if (poseWorld) {
        const worldForearm = Math.hypot(
          poseWorld[cfg.w].x - poseWorld[cfg.e].x,
          poseWorld[cfg.w].y - poseWorld[cfg.e].y,
          poseWorld[cfg.w].z - poseWorld[cfg.e].z
        );
        const sceneForearm2D = Math.hypot(
          (lmW.x - lmE.x) * 2 * aspect,
          (lmW.y - lmE.y) * 2
        );
        if (worldForearm > 0.05) {
          frame.scale = THREE.MathUtils.clamp(sceneForearm2D / worldForearm, 0.4, 4.0);
        }
      }

      const zS = poseWorld ? -poseWorld[cfg.s].z * frame.scale : -lmS.z * aspect;
      const zE = poseWorld ? -poseWorld[cfg.e].z * frame.scale : -lmE.z * aspect;
      const zW = poseWorld ? -poseWorld[cfg.w].z * frame.scale : -lmW.z * aspect;

      this.toSceneXY(lmS, aspect, this.tmpVec).setZ(zS);
      this.smoothTo(`${cfg.side}_s`, this.tmpVec, frame.shoulder);

      this.toSceneXY(lmE, aspect, this.tmpVec).setZ(zE);
      this.smoothTo(`${cfg.side}_e`, this.tmpVec, frame.elbow);

      this.toSceneXY(lmW, aspect, this.tmpVec).setZ(zW);
      this.smoothTo(`${cfg.side}_w`, this.tmpVec, frame.wrist);

      let bestHandIdx = -1;
      let bestDist = 0.22;
      handRes.landmarks.forEach((h, hIdx) => {
        if (usedHands.has(hIdx)) return;
        const dist = Math.hypot(h[0].x - lmW.x, h[0].y - lmW.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestHandIdx = hIdx;
        }
      });

      if (bestHandIdx === -1) {
        frame.hasHand = false;
        this.resetKeys(`${cfg.side}_h_`);
        continue;
      }

      usedHands.add(bestHandIdx);
      frame.hasHand = true;

      const hNorm = handRes.landmarks[bestHandIdx];
      const hWorld = handRes.worldLandmarks?.[bestHandIdx] ?? null;

      if (hWorld) {
        const worldPalmLen = Math.hypot(
          hWorld[9].x - hWorld[0].x,
          hWorld[9].y - hWorld[0].y,
          hWorld[9].z - hWorld[0].z
        );
        const scenePalmLen2D = Math.hypot(
          (hNorm[9].x - hNorm[0].x) * 2 * aspect,
          (hNorm[9].y - hNorm[0].y) * 2
        );
        if (worldPalmLen > 0.02) {
          frame.handScale = THREE.MathUtils.clamp(scenePalmLen2D / worldPalmLen, 0.4, 5.0);
        }

        this.worldToSceneDir(hWorld[0], hWorld[9], this.tmpUp).normalize();
        this.worldToSceneDir(hWorld[17], hWorld[5], this.tmpAcross).normalize();

        if (cfg.side === 'right') {
          frame.palm.normal.crossVectors(this.tmpUp, this.tmpAcross).normalize();
        } else {
          frame.palm.normal.crossVectors(this.tmpAcross, this.tmpUp).normalize();
        }
        frame.palm.up.copy(this.tmpUp);
        frame.palm.right.crossVectors(frame.palm.up, frame.palm.normal).normalize();
      }

      this.toSceneXY(hNorm[0], aspect, this.tmpVec);
      this.tmpOffset.set(
        frame.wrist.x - this.tmpVec.x,
        frame.wrist.y - this.tmpVec.y,
        frame.wrist.z
      );

      for (let i = 0; i < 21; i++) {
        this.toSceneXY(hNorm[i], aspect, this.tmpVec);
        const relZ = hWorld
          ? -(hWorld[i].z - hWorld[0].z) * frame.handScale
          : -(hNorm[i].z - hNorm[0].z) * aspect;

        this.tmpVec.set(
          this.tmpVec.x + this.tmpOffset.x,
          this.tmpVec.y + this.tmpOffset.y,
          this.tmpOffset.z + relZ
        );
        this.smoothTo(`${cfg.side}_h_${i}`, this.tmpVec, frame.hand[i]);
      }
      frame.hand[0].copy(frame.wrist);
    }

    return { poseLandmarks: pose, frames: this.frames };
  }

  public dispose(): void {
    this.poseLandmarker?.close();
    this.handLandmarker?.close();
  }
}