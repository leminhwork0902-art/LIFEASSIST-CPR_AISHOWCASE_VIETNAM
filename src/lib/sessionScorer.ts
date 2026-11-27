import { TARGET_BPM_MAX, TARGET_BPM_MIN, MIN_COMPRESSING_MS_FOR_SCORE } from './config.ts';
import type { PostureLabel } from './posture.ts';

export type MainIssue = 'NONE' | 'TOO_SLOW' | 'TOO_FAST' | 'BENT_ELBOW' | 'OFF_AXIS';

export interface SessionSummary {
  totalCompressions: number;
  durationSec: number;
  /** % thời lượng phiên mà người tập thực sự đang ép. */
  compressingPct: number;
  /** false nếu thời gian ép quá ngắn để các phần trăm có ý nghĩa. */
  enoughData: boolean;
  avgBpm: number | null;
  bpmInTargetPct: number | null;
  goodPosturePct: number | null;
  mainIssue: MainIssue;
}

export interface FrameInput {
  dtMs: number;
  compressing: boolean;
  bpm: number | null;
  posture: PostureLabel;
}

/**
 * Chấm điểm theo THỜI GIAN (ms), không theo số khung hình, nên không bị lệch
 * theo FPS. Chỉ tính những lúc người tập đang ép (detector báo compressing),
 * nên 3 giây vào tư thế đầu phiên không kéo điểm xuống.
 */
export class SessionScorer {
  private compressingMs = 0;
  private goodMs = 0;
  private bentMs = 0;
  private offAxisMs = 0;
  private rateMs = 0;
  private bpmWeighted = 0;
  private inTargetMs = 0;
  private slowMs = 0;
  private fastMs = 0;
  private compressions = 0;

  addPeak(): void {
    this.compressions += 1;
  }

  addFrame(f: FrameInput): void {
    const dt = Math.min(Math.max(f.dtMs, 0), 100); // chặn khung hình trễ bất thường
    if (!f.compressing) return;
    this.compressingMs += dt;
    if (f.posture === 'CORRECT_POSTURE') this.goodMs += dt;
    else if (f.posture === 'BENT_ELBOW') this.bentMs += dt;
    else this.offAxisMs += dt;

    if (f.bpm !== null) {
      this.rateMs += dt;
      this.bpmWeighted += f.bpm * dt;
      if (f.bpm < TARGET_BPM_MIN) this.slowMs += dt;
      else if (f.bpm > TARGET_BPM_MAX) this.fastMs += dt;
      else this.inTargetMs += dt;
    }
  }

  summarize(durationSec: number): SessionSummary {
    const enough = this.compressingMs >= MIN_COMPRESSING_MS_FOR_SCORE;
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);

    let mainIssue: MainIssue = 'NONE';
    if (enough) {
      const cand: [MainIssue, number][] = [
        ['TOO_SLOW', this.slowMs],
        ['TOO_FAST', this.fastMs],
        ['BENT_ELBOW', this.bentMs],
        ['OFF_AXIS', this.offAxisMs],
      ];
      cand.sort((a, b) => b[1] - a[1]);
      // Chỉ nêu "lỗi chính" nếu nó chiếm ≥ 15% thời gian ép
      if (cand[0][1] >= 0.15 * this.compressingMs) mainIssue = cand[0][0];
    }

    return {
      totalCompressions: this.compressions,
      durationSec,
      compressingPct: Math.min(100, Math.round((this.compressingMs / (durationSec * 1000)) * 100)),
      enoughData: enough,
      avgBpm: enough && this.rateMs > 0 ? Math.round(this.bpmWeighted / this.rateMs) : null,
      bpmInTargetPct: enough ? pct(this.inTargetMs, this.rateMs) : null,
      goodPosturePct: enough ? pct(this.goodMs, this.compressingMs) : null,
      mainIssue,
    };
  }
}
