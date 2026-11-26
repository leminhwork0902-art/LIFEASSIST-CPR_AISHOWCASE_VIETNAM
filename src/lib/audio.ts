import { asset } from './assets.ts';

export type CueId = 'faster' | 'slower' | 'straighten' | 'shoulders';
export type Lang = 'vi' | 'en';

export const ALL_CUES: CueId[] = ['faster', 'slower', 'straighten', 'shoulders'];

type AudioCtor = typeof AudioContext;
function getCtor(): AudioCtor | undefined {
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
}

export interface CueLoadReport {
  loaded: CueId[];
  missing: CueId[];
}

/**
 * Âm thanh của ứng dụng:
 *  - Nhắc giọng nói: file thu sẵn public/audio/{vi|en}/{faster|slower|straighten|shoulders}.mp3,
 *    giải mã sẵn vào bộ nhớ (WebAudio) → độ trễ thấp, và sau khi người dùng bấm nút
 *    một lần thì iOS/Safari cho phép phát các lần sau.
 *  - Nếu thiếu file: dùng speechSynthesis làm DỰ PHÒNG và báo cho giao diện biết
 *    (trước đây lỗi này bị nuốt im lặng nên cảnh báo giọng nói không phát gì cả).
 *  - Metronome: sinh tiếng "tick" bằng WebAudio nên không cần file, chạy offline, đúng nhịp.
 */
export class AudioCoach {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private metroTimer: number | null = null;
  private nextClick = 0;
  private metroBpm = 0;

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const C = getCtor();
    if (!C) return null;
    this.ctx = new C();
    return this.ctx;
  }

  /** Gọi trong sự kiện bấm nút của người dùng (bắt buộc với iOS/Safari). */
  unlock(): void {
    const ctx = this.ensureCtx();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  async preload(lang: Lang): Promise<CueLoadReport> {
    const ctx = this.ensureCtx();
    const loaded: CueId[] = [];
    const missing: CueId[] = [];
    await Promise.all(
      ALL_CUES.map(async (cue) => {
        const key = `${lang}/${cue}`;
        if (this.buffers.has(key)) {
          loaded.push(cue);
          return;
        }
        try {
          if (!ctx) throw new Error('no AudioContext');
          const res = await fetch(asset(`audio/${lang}/${cue}.mp3`));
          const type = res.headers.get('content-type') ?? '';
          // Vite dev trả index.html (200) cho file không tồn tại → phải loại trường hợp này
          if (!res.ok || type.includes('text/html')) throw new Error('missing');
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          this.buffers.set(key, buf);
          loaded.push(cue);
        } catch {
          missing.push(cue);
        }
      }),
    );
    return { loaded, missing };
  }

  /** Trả về nguồn đã dùng để phát. */
  playCue(cue: CueId, lang: Lang, fallbackText: string): 'file' | 'speech' | 'none' {
    const ctx = this.ctx;
    const buf = this.buffers.get(`${lang}/${cue}`);
    if (ctx && buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
      return 'file';
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(fallbackText);
      u.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
      window.speechSynthesis.speak(u);
      return 'speech';
    }
    return 'none';
  }

  get metronomeOn(): boolean {
    return this.metroTimer !== null;
  }

  startMetronome(bpm: number): void {
    const ctx = this.ensureCtx();
    if (!ctx || this.metroTimer !== null) return;
    if (ctx.state === 'suspended') void ctx.resume();
    this.metroBpm = bpm;
    this.nextClick = ctx.currentTime + 0.08;
    // Lập lịch trước ~120 ms bằng đồng hồ của WebAudio để nhịp không bị trôi theo setInterval
    this.metroTimer = window.setInterval(() => {
      while (this.nextClick < ctx.currentTime + 0.12) {
        this.click(ctx, this.nextClick);
        this.nextClick += 60 / this.metroBpm;
      }
    }, 25);
  }

  stopMetronome(): void {
    if (this.metroTimer !== null) {
      window.clearInterval(this.metroTimer);
      this.metroTimer = null;
    }
  }

  private click(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  dispose(): void {
    this.stopMetronome();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.buffers.clear();
  }
}
