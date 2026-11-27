import type { PostureLabel } from './posture.ts';

export type CameraAngle = 'SIDE_90' | 'DIAGONAL_45' | 'FRONT_0';
export type Lighting = 'BRIGHT' | 'DIM';

export interface RecorderMeta {
  subjectId: string;
  label: PostureLabel;
  cameraAngle: CameraAngle;
  lighting: Lighting;
  device: string;
}

export interface FrameSample {
  tMs: number; // so với lúc bắt đầu ghi
  elbowAngleDeg: number;
  offsetNorm: number;
  wristYNorm: number;
  wristYSmooth: number;
  armVisibility: number;
  fps: number;
  isCompressing: boolean;
  detectedPeak: boolean;
  gtTap: boolean;
}

export const CSV_HEADERS = [
  'session_id',
  'subject_id',
  'label',
  'camera_angle',
  'lighting',
  'device',
  't_ms',
  'elbow_angle_deg',
  'shoulder_wrist_offset_norm',
  'wrist_y_norm',
  'wrist_y_smooth',
  'arm_visibility',
  'fps',
  'is_compressing',
  'detected_peak',
  'gt_tap',
] as const;

function esc(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Chỉ ghi tọa độ khớp đã chuẩn hoá và các cờ sự kiện. KHÔNG ghi hình ảnh/video.
 * `gt_tap` = người thứ hai bấm phím cách theo từng nhịp ép (đối chứng độc lập).
 * `detected_peak` = khung hình mà thuật toán đếm ra một lần ép (để so sai số).
 */
export class CsvRecorder {
  private lines: string[] = [];
  private sessionId = '';
  private t0 = 0;
  private pendingTap = false;

  get count(): number {
    return this.lines.length;
  }

  start(nowMs: number): void {
    this.sessionId = `rec_${Date.now().toString(36)}`;
    this.t0 = nowMs;
    this.pendingTap = false;
  }

  /** Đánh dấu một nhịp "thật"; sẽ được gắn vào khung hình kế tiếp. */
  tap(): void {
    this.pendingTap = true;
  }

  push(nowMs: number, meta: RecorderMeta, s: Omit<FrameSample, 'tMs' | 'gtTap'>): void {
    const tap = this.pendingTap;
    this.pendingTap = false;
    this.lines.push(
      [
        this.sessionId,
        esc(meta.subjectId),
        meta.label,
        meta.cameraAngle,
        meta.lighting,
        esc(meta.device),
        (nowMs - this.t0).toFixed(1),
        s.elbowAngleDeg.toFixed(2),
        s.offsetNorm.toFixed(4),
        s.wristYNorm.toFixed(4),
        s.wristYSmooth.toFixed(4),
        s.armVisibility.toFixed(3),
        String(Math.round(s.fps)),
        s.isCompressing ? '1' : '0',
        s.detectedPeak ? '1' : '0',
        tap ? '1' : '0',
      ].join(','),
    );
  }

  clear(): void {
    this.lines = [];
  }

  toCsv(): string {
    return [CSV_HEADERS.join(','), ...this.lines].join('\n');
  }

  download(subjectId: string): void {
    if (this.lines.length === 0) return;
    const safe = subjectId.replace(/[^A-Za-z0-9_-]/g, '_') || 'subject';
    const blob = new Blob([this.toCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeassist_cpr_${safe}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
