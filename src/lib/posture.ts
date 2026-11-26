import { ELBOW_MIN_DEG, SHOULDER_OFFSET_MAX, MIN_ARM_VISIBILITY } from './config.ts';

export type PostureLabel = 'CORRECT_POSTURE' | 'BENT_ELBOW' | 'OFF_AXIS';
export type ArmSide = 'LEFT' | 'RIGHT';

export interface Pt {
  x: number;
  y: number;
  visibility?: number;
}

export interface ArmMetrics {
  side: ArmSide;
  /** Góc vai–khuỷu–cổ tay (độ), đã bù tỉ lệ khung hình. 180° = thẳng. */
  elbowAngleDeg: number;
  /** |lệch ngang vai–cổ tay| / chiều dài thân. 0 = vai ngay trên cổ tay. */
  offsetNorm: number;
  /** (y cổ tay − y hông) / chiều dài thân. Tín hiệu đưa vào bộ đếm nhịp. */
  wristYNorm: number;
  /** Trung bình độ hiển thị của vai, khuỷu, cổ tay (0–1). */
  visibility: number;
}

/** Góc tại điểm b của tam giác a–b–c, đơn vị độ. `aspect` = width/height của khung hình. */
export function calculateAngleDeg(a: Pt, b: Pt, c: Pt, aspect: number): number {
  const bax = (a.x - b.x) * aspect;
  const bay = a.y - b.y;
  const bcx = (c.x - b.x) * aspect;
  const bcy = c.y - b.y;
  const magBA = Math.hypot(bax, bay);
  const magBC = Math.hypot(bcx, bcy);
  if (magBA === 0 || magBC === 0) return 0;
  const cos = Math.max(-1, Math.min(1, (bax * bcx + bay * bcy) / (magBA * magBC)));
  return (Math.acos(cos) * 180) / Math.PI;
}

const IDX = {
  LEFT: { shoulder: 11, elbow: 13, wrist: 15, hip: 23 },
  RIGHT: { shoulder: 12, elbow: 14, wrist: 16, hip: 24 },
} as const;

function armVisibility(lm: Pt[], side: ArmSide): number {
  const i = IDX[side];
  return ((lm[i.shoulder].visibility ?? 0) + (lm[i.elbow].visibility ?? 0) + (lm[i.wrist].visibility ?? 0)) / 3;
}

/**
 * Chọn tay để đo. Có "độ trễ chọn": giữ nguyên tay đang dùng trừ khi tay kia
 * rõ hơn hẳn `switchMargin`. Nếu không, khi hai tay có độ hiển thị gần nhau,
 * tọa độ sẽ nhảy qua lại giữa hai cổ tay và bị đếm thành nhịp ép giả.
 */
export function chooseSide(lm: Pt[], current: ArmSide | null, switchMargin = 0.15): ArmSide {
  const l = armVisibility(lm, 'LEFT');
  const r = armVisibility(lm, 'RIGHT');
  if (current === null) return l >= r ? 'LEFT' : 'RIGHT';
  const cur = current === 'LEFT' ? l : r;
  const other = current === 'LEFT' ? r : l;
  return other > cur + switchMargin ? (current === 'LEFT' ? 'RIGHT' : 'LEFT') : current;
}

export function computeArmMetrics(lm: Pt[], aspect: number, side: ArmSide): ArmMetrics {
  const i = IDX[side];
  const shoulder = lm[i.shoulder];
  const elbow = lm[i.elbow];
  const wrist = lm[i.wrist];
  const hip = lm[i.hip];
  const torsoLen = Math.max(0.05, Math.hypot((shoulder.x - hip.x) * aspect, shoulder.y - hip.y));
  return {
    side,
    elbowAngleDeg: calculateAngleDeg(shoulder, elbow, wrist, aspect),
    offsetNorm: Math.abs((shoulder.x - wrist.x) * aspect) / torsoLen,
    wristYNorm: (wrist.y - hip.y) / torsoLen,
    visibility: armVisibility(lm, side),
  };
}

export function isArmVisible(m: ArmMetrics): boolean {
  return m.visibility >= MIN_ARM_VISIBILITY;
}

/**
 * Baseline: phân loại bằng ngưỡng cố định (ELBOW_MIN_DEG, SHOULDER_OFFSET_MAX).
 * Khi cả hai lỗi cùng xảy ra, ưu tiên báo gập khuỷu (dễ sửa và ảnh hưởng nhiều hơn).
 * ml/train_classifier.py so sánh bộ phân loại huấn luyện với đúng hàm này.
 */
export function classifyByThreshold(elbowAngleDeg: number, offsetNorm: number): PostureLabel {
  if (elbowAngleDeg < ELBOW_MIN_DEG) return 'BENT_ELBOW';
  if (offsetNorm > SHOULDER_OFFSET_MAX) return 'OFF_AXIS';
  return 'CORRECT_POSTURE';
}

/** Bộ lọc EMA theo thời gian cho một đại lượng vô hướng. */
export class TimeEma {
  private v: number | null = null;
  private last = 0;
  private tau: number;
  constructor(tauMs: number) {
    this.tau = tauMs;
  }
  reset(): void {
    this.v = null;
  }
  push(x: number, tMs: number): number {
    if (this.v === null) {
      this.v = x;
    } else {
      const a = 1 - Math.exp(-Math.max(0, tMs - this.last) / this.tau);
      this.v += a * (x - this.v);
    }
    this.last = tMs;
    return this.v;
  }
}
