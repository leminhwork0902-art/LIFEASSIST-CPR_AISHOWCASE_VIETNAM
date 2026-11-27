import type { Lang } from './audio';

export type CoachState =
  | 'idle'
  | 'demo'
  | 'good'
  | 'fix_elbow'
  | 'too_slow'
  | 'too_fast';

export interface CoachCue {
  text: string;
  file: string;
  badge: string;
}

export const COACH_ACCENT_COLORS: Record<CoachState, string> = {
  idle: '#38bdf8',
  demo: '#22d3ee',
  good: '#4ade80',
  fix_elbow: '#fbbf24',
  too_slow: '#fb923c',
  too_fast: '#f87171',
};

export const COACH_CUES: Record<Lang, Record<CoachState, CoachCue>> = {
  vi: {
    idle: {
      text: 'Chào bạn! Nhấn Bắt đầu hoặc Xem mẫu 110 BPM để cùng luyện ép tim nhé.',
      file: '/audio/coach/vi/idle.mp3',
      badge: 'Sẵn sàng',
    },
    demo: {
      text: 'Đan hai tay, khóa thẳng khuỷu và ấn đều theo nhịp 110 lần mỗi phút.',
      file: '/audio/coach/vi/demo.mp3',
      badge: 'Làm mẫu 110 BPM',
    },
    good: {
      text: 'Rất chuẩn! Giữ vững nhịp độ và tư thế này nhé.',
      file: '/audio/coach/vi/good.mp3',
      badge: 'Tư thế chuẩn',
    },
    fix_elbow: {
      text: 'Duỗi thẳng hai khuỷu tay ra nào! Dùng lực thân trên ấn xuống.',
      file: '/audio/coach/vi/fix_elbow.mp3',
      badge: 'Thẳng khuỷu tay',
    },
    too_slow: {
      text: 'Nhanh hơn một chút nữa để đạt 100 đến 120 nhịp mỗi phút!',
      file: '/audio/coach/vi/too_slow.mp3',
      badge: 'Nhanh hơn chút',
    },
    too_fast: {
      text: 'Chậm lại một chút cho đều nhịp và đủ độ sâu nhé.',
      file: '/audio/coach/vi/too_fast.mp3',
      badge: 'Chậm lại chút',
    },
  },
  en: {
    idle: {
      text: 'Hi! Press Start or Watch 110 BPM demo to practice chest compressions.',
      file: '/audio/coach/en/idle.mp3',
      badge: 'Ready',
    },
    demo: {
      text: 'Interlock your hands, lock your elbows straight, and press at 110 beats per minute.',
      file: '/audio/coach/en/demo.mp3',
      badge: '110 BPM Demo',
    },
    good: {
      text: 'Great form! Keep this steady rhythm and posture.',
      file: '/audio/coach/en/good.mp3',
      badge: 'Great Form',
    },
    fix_elbow: {
      text: 'Straighten both elbows! Press down using your upper body weight.',
      file: '/audio/coach/en/fix_elbow.mp3',
      badge: 'Straighten Elbows',
    },
    too_slow: {
      text: 'Push a little faster to reach 100 to 120 compressions per minute!',
      file: '/audio/coach/en/too_slow.mp3',
      badge: 'Push Faster',
    },
    too_fast: {
      text: 'Slow down slightly to keep a steady rhythm and full chest recoil.',
      file: '/audio/coach/en/too_fast.mp3',
      badge: 'Slow Down',
    },
  },
};

export class CoachAudioController {
  private audio: HTMLAudioElement | null = null;
  private lastSpokenState: CoachState | null = null;
  private lastSpokenLang: Lang | null = null;
  private lastSpokenTime = 0;
  private muted = false;
  private cooldownMs = 4500;
  private onSpeakingChange?: (speaking: boolean) => void;

  constructor(onSpeakingChange?: (speaking: boolean) => void) {
    this.onSpeakingChange = onSpeakingChange;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stop();
    }
  }

  public stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.onSpeakingChange?.(false);
  }

  public speak(state: CoachState, lang: Lang = 'vi', force = false) {
    if (this.muted) return;

    const now = Date.now();
    const isSameCue =
      state === this.lastSpokenState && lang === this.lastSpokenLang;
    const elapsed = now - this.lastSpokenTime;

    if (!force) {
      if (isSameCue && elapsed < this.cooldownMs) return;
      if (!isSameCue && elapsed < 1200) return;
    }

    this.stop();
    this.lastSpokenState = state;
    this.lastSpokenLang = lang;
    this.lastSpokenTime = now;

    const cue = COACH_CUES[lang][state];
    const audio = new Audio(cue.file);
    this.audio = audio;

    audio.onplay = () => this.onSpeakingChange?.(true);
    audio.onended = () => this.onSpeakingChange?.(false);
    audio.onerror = () => {
      this.speakFallbackTTS(cue.text, lang);
    };

    audio.play().catch(() => {
      this.speakFallbackTTS(cue.text, lang);
    });
  }

  private speakFallbackTTS(text: string, lang: Lang) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.onSpeakingChange?.(false);
      return;
    }
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang === 'en' ? 'en-US' : 'vi-VN';
      utter.rate = 1.06;
      utter.pitch = 1.05;
      utter.onstart = () => this.onSpeakingChange?.(true);
      utter.onend = () => this.onSpeakingChange?.(false);
      utter.onerror = () => this.onSpeakingChange?.(false);
      window.speechSynthesis.speak(utter);
    } catch {
      this.onSpeakingChange?.(false);
    }
  }

  public dispose() {
    this.stop();
  }
}