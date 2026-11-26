import type * as THREE from 'three';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type Side = 'left' | 'right';

export interface PalmBasis {
  right: THREE.Vector3;
  up: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface ArmHandFrame {
  side: Side;
  active: boolean;
  hasHand: boolean;
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  wrist: THREE.Vector3;
  hand: THREE.Vector3[];
  palm: PalmBasis;
  scale: number;
  handScale: number;
}

export interface TrackResult {
  poseLandmarks: NormalizedLandmark[] | null;
  frames: readonly ArmHandFrame[];
}