import { useEffect, useState } from 'react';
import { PoseTracker } from './components/PoseTracker.tsx';
import { CoachAvatar } from './components/CoachAvatar.tsx';
import { IconHeartPulse } from './components/Icons.tsx';
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
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <IconHeartPulse size={22} />
          </span>
          <div className="brand-text">
            <h1>{t('appTitle')}</h1>
            <p>{t('appSubtitle')}</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="privacy-badge">
            <span className="badge-dot" aria-hidden="true" />
            {t('appBadge')}
          </span>
          <div id="mode-slot" className="mode-slot" />
          <div className="lang-switch" role="group" aria-label={t('language')}>
            <button
              type="button"
              className={lang === 'vi' ? 'active' : ''}
              aria-pressed={lang === 'vi'}
              onClick={() => setLang('vi')}
            >
              VI
            </button>
            <button
              type="button"
              className={lang === 'en' ? 'active' : ''}
              aria-pressed={lang === 'en'}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <PoseTracker
          lang={lang}
          onCoachStatusChange={setCoachStatus}
          modeSlotId="mode-slot"
          coachSlot={
            <CoachAvatar
              state={coachStatus.state}
              lang={lang}
              bpm={coachStatus.bpm}
              disableAutoSpeech={coachStatus.isActiveSession}
              externalSpeaking={coachStatus.externalSpeaking}
              showDebugControls={false}
            />
          }
        />
      </main>

      <footer className="app-footer">
        <span>LifeAssist CPR</span>
        <span className="num">
          {t('footerVersion')} {APP_VERSION}
        </span>
      </footer>
    </div>
  );
}

export default App;
