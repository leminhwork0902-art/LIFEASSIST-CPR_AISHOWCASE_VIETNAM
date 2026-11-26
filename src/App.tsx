import { useEffect, useState } from 'react';
import { PoseTracker } from './components/PoseTracker.tsx';
import { CoachAvatar } from './components/CoachAvatar.tsx';
import { tr } from './i18n.ts';
import { APP_VERSION } from './lib/config.ts';
import type { Lang } from './lib/audio.ts';
import type { CoachState } from './lib/coachAudio.ts';
import './App.css';

const LANG_KEY = 'lifeassist.lang';

function initialLang(): Lang {
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved === 'vi' || saved === 'en') return saved;
  } catch {
    /* localStorage có thể bị chặn; dùng mặc định */
  }
  return 'vi';
}

function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [coachStatus, setCoachStatus] = useState<{
    state: CoachState;
    bpm: number | null;
    isActiveSession: boolean;
    externalSpeaking: boolean;
  }>({
    state: 'idle',
    bpm: null,
    isActiveSession: false,
    externalSpeaking: false,
  });

  const t = tr(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* bỏ qua */
    }
  }, [lang]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>{t('appTitle')}</h1>
          <p>{t('appSubtitle')}</p>
        </div>
        <div className="lang-switch" role="group" aria-label={t('language')}>
          <button
            type="button"
            className={lang === 'vi' ? 'active' : ''}
            onClick={() => setLang('vi')}
          >
            VI
          </button>
          <button
            type="button"
            className={lang === 'en' ? 'active' : ''}
            onClick={() => setLang('en')}
          >
            EN
          </button>
        </div>
      </header>

      <PoseTracker lang={lang} onCoachStatusChange={setCoachStatus} />

      <footer className="app-footer">v{APP_VERSION}</footer>

      <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 50 }}>
        <CoachAvatar
          state={coachStatus.state}
          lang={lang}
          bpm={coachStatus.bpm}
          disableAutoSpeech={coachStatus.isActiveSession}
          externalSpeaking={coachStatus.externalSpeaking}
          showDebugControls={false}
        />
      </div>
    </div>
  );
}

export default App;