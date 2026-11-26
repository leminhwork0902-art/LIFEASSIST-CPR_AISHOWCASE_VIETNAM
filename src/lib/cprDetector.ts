/**
 * Bộ đếm nhịp ép tim — đội tự viết.
 *
 * Tín hiệu vào: độ cao cổ tay đã chuẩn hoá theo chiều dài thân (wristYNorm),
 * trục y của ảnh hướng xuống nên "ép xuống" = y tăng.
 *
 * Các bước:
 *  1. Làm mượt bằng EMA theo THỜI GIAN (ms), không theo số khung hình,
 *     nên độ nhạy không phụ thuộc FPS của máy.
 *  2. Tìm đỉnh bằng trạng thái trễ (hysteresis): một đỉnh chỉ được ghi nhận khi
 *     tín hiệu đã tăng ít nhất `minProminence` so với đáy trước đó rồi giảm
 *     ít nhất `minProminence` so với đỉnh.
 *  3. Nhịp = (số đỉnh - 1) / khoảng thời gian, trong cửa sổ trượt `rateWindowMs`.
 *
 * Lớp này không phụ thuộc React/MediaPipe nên kiểm thử được bằng Node
 * (xem tools/test-detector.ts).
 */

export interface DetectorConfig {
  /** Hằng số thời gian của bộ lọc EMA (ms). */
  smoothingTauMs: number;
  /** Biên độ tối thiểu (đơn vị = chiều dài thân) để tính là một lần ép. CHƯA hiệu chỉnh. */
  minProminence: number;
  /** Khoảng cách tối thiểu giữa hai đỉnh (ms). 270 ms ≈ 222 lần/phút. */
  minIntervalMs: number;
  /** Cửa sổ tính nhịp (ms). */
  rateWindowMs: number;
  /** Số đỉnh tối thiểu trong cửa sổ để báo nhịp. */
  minPeaksForRate: number;
  /** Quá thời gian này không có đỉnh mới thì coi là đã ngừng ép (ms). */
  activeTimeoutMs: number;
  /** Khoảng cách giữa hai đỉnh lớn hơn mức này thì coi là nghỉ, tính lại nhịp từ đầu (ms). */
  restartGapMs: number;
  /** Nhịp ngoài khoảng này bị coi là nhiễu và không báo. */
  minPlausibleBpm: number;
  maxPlausibleBpm: number;
}

export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  smoothingTauMs: 50,
  minProminence: 0.04,
  minIntervalMs: 270,
  rateWindowMs: 6000,
  minPeaksForRate: 3,
  activeTimeoutMs: 2000,
  restartGapMs: 1500,
  minPlausibleBpm: 40,
  maxPlausibleBpm: 200,
};

export interface DetectorOutput {
  /** Tín hiệu sau khi làm mượt. */
  smoothed: number;
  /** true nếu khung hình này vừa ghi nhận thêm một lần ép. */
  peak: boolean;
  /** Nhịp (lần/phút) hoặc null nếu chưa đủ dữ liệu. */
  bpm: number | null;
  /** Đang ép: có đỉnh mới trong `activeTimeoutMs` gần nhất. */
  compressing: boolean;
  /** Tổng số lần ép đã đếm từ lúc reset. */
  totalPeaks: number;
}

type Mode = 'INIT' | 'SEEK_MAX' | 'SEEK_MIN';

export class CprDetector {
  private cfg: DetectorConfig;
  private smooth: number | null = null;
  private lastT = 0;
  private mode: Mode = 'INIT';
  private maxY = 0;
  private maxT = 0;
  private minY = 0;
  private initSeeded = false;
  private peaks: number[] = [];
  private lastPeakT = -Infinity;
  private total = 0;

  constructor(cfg: Partial<DetectorConfig> = {}) {
    this.cfg = { ...DEFAULT_DETECTOR_CONFIG, ...cfg };
  }

  /** Xoá toàn bộ trạng thái (dùng khi bắt đầu phiên mới). */
  reset(): void {
    this.smooth = null;
    this.mode = 'INIT';
    this.initSeeded = false;
    this.peaks = [];
    this.lastPeakT = -Infinity;
    this.total = 0;
  }

  /**
   * Gọi khi mất dấu tay (độ hiển thị thấp). Bỏ trạng thái tìm đỉnh để tọa độ
   * nhảy lung tung không bị đếm thành nhịp, nhưng giữ tổng đã đếm.
   */
  notifyLost(): void {
    this.smooth = null;
    this.mode = 'INIT';
    this.initSeeded = false;
  }

  update(y: number, tMs: number): DetectorOutput {
    const cfg = this.cfg;

    // 1. Làm mượt theo thời gian
    if (this.smooth === null) {
      this.smooth = y;
    } else {
      const dt = Math.max(0, tMs - this.lastT);
      const alpha = 1 - Math.exp(-dt / cfg.smoothingTauMs);
      this.smooth += alpha * (y - this.smooth);
    }
    this.lastT = tMs;
    const s = this.smooth;

    // 2. Tìm đỉnh với hysteresis
    let peak = false;
    if (this.mode === 'INIT') {
      if (!this.initSeeded) {
        this.maxY = s;
        this.minY = s;
        this.maxT = tMs;
        this.initSeeded = true;
      }
      if (s > this.maxY) {
        this.maxY = s;
        this.maxT = tMs;
      }
      if (s < this.minY) this.minY = s;
      if (s - this.minY >= cfg.minProminence) {
        this.mode = 'SEEK_MAX';
        this.maxY = s;
        this.maxT = tMs;
      } else if (this.maxY - s >= cfg.minProminence) {
        this.mode = 'SEEK_MIN';
        this.minY = s;
      }
    } else if (this.mode === 'SEEK_MAX') {
      if (s > this.maxY) {
        this.maxY = s;
        this.maxT = tMs;
      } else if (this.maxY - s >= cfg.minProminence) {
        peak = this.registerPeak(this.maxT);
        this.mode = 'SEEK_MIN';
        this.minY = s;
      }
    } else {
      if (s < this.minY) {
        this.minY = s;
      } else if (s - this.minY >= cfg.minProminence) {
        this.mode = 'SEEK_MAX';
        this.maxY = s;
        this.maxT = tMs;
      }
    }

    // 3. Tính nhịp
    const cutoff = tMs - cfg.rateWindowMs;
    while (this.peaks.length > 0 && this.peaks[0] < cutoff) this.peaks.shift();

    const compressing = tMs - this.lastPeakT <= cfg.activeTimeoutMs && this.peaks.length >= 2;

    let bpm: number | null = null;
    if (compressing && this.peaks.length >= cfg.minPeaksForRate) {
      const span = this.peaks[this.peaks.length - 1] - this.peaks[0];
      if (span > 0) {
        const raw = ((this.peaks.length - 1) * 60000) / span;
        if (raw >= cfg.minPlausibleBpm && raw <= cfg.maxPlausibleBpm) bpm = Math.round(raw);
      }
    }

    return { smoothed: s, peak, bpm, compressing, totalPeaks: this.total };
  }

  private registerPeak(peakT: number): boolean {
    const cfg = this.cfg;
    const gap = peakT - this.lastPeakT;
    if (gap < cfg.minIntervalMs) return false; // quá sát đỉnh trước: coi là nhiễu
    if (gap > cfg.restartGapMs) this.peaks = []; // vừa nghỉ: tính nhịp lại từ đầu
    this.peaks.push(peakT);
    this.lastPeakT = peakT;
    this.total += 1;
    return true;
  }
}
