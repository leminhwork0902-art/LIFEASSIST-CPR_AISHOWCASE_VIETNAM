import type { T } from '../i18n.ts';
import { METRONOME_BPM } from '../lib/config.ts';
import { IconActivity, IconPhone, IconPlay, IconStop } from './Icons.tsx';

interface Props {
  t: T;
  metronomeOn: boolean;
  onToggleMetronome: () => void;
}

const AHA_URL = 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-and-advanced-life-support';

/** Nút gọi 115 + nút nhịp mẫu cỡ lớn — đặt ngay trên khung camera. */
export function EmergencyActions({ t, metronomeOn, onToggleMetronome }: Props) {
  return (
    <section className="em-actions" aria-label={t('modeEmergencyShort')}>
      <a className="btn-call" href="tel:115">
        <IconPhone size={28} />
        <span>{t('emCall')}</span>
      </a>

      <button
        type="button"
        className={`btn-metro ${metronomeOn ? 'on' : ''}`}
        onClick={onToggleMetronome}
        aria-pressed={metronomeOn}
      >
        <span className="metro-pulse" aria-hidden="true">
          <IconActivity size={22} />
        </span>
        <span className="metro-text">
          <span className="metro-main">
            {metronomeOn ? <IconStop size={16} /> : <IconPlay size={16} />}
            {metronomeOn ? t('metronomeOff') : t('metronomeOn')}
          </span>
          <span className="metro-sub">
            <span className="num">{METRONOME_BPM}</span> BPM · {t('emBeatHint')}
          </span>
        </span>
      </button>
    </section>
  );
}

/** 4 bước CPR chỉ ép tim (AHA 2025). */
export function EmergencySteps({ t }: { t: T }) {
  const steps = [t('emStep1'), t('emStep2'), t('emStep3'), t('emStep4')];
  return (
    <section className="card em-steps-card" aria-labelledby="em-steps-title">
      <h2 id="em-steps-title" className="em-title">
        {t('emStepsTitle')}
      </h2>
      <ol className="em-steps">
        {steps.map((s, i) => (
          <li key={i}>
            <span className="em-step-num num" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="em-step-text">{s}</span>
          </li>
        ))}
      </ol>

      <p className="em-source">
        {t('emSource')}{' '}
        <a href={AHA_URL} target="_blank" rel="noreferrer noopener">
          cpr.heart.org
        </a>
        <br />
        <em>{t('emSourceNote')}</em>
      </p>
    </section>
  );
}

export function EmergencyPanel(props: Props) {
  return (
    <div className="panel-emergency">
      <EmergencyActions {...props} />
      <EmergencySteps t={props.t} />
    </div>
  );
}
