import type { T } from '../i18n.ts';
import { METRONOME_BPM } from '../lib/config.ts';

interface Props {
  t: T;
  metronomeOn: boolean;
  onToggleMetronome: () => void;
}

const AHA_URL = 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-and-advanced-life-support';

export function EmergencyPanel({ t, metronomeOn, onToggleMetronome }: Props) {
  return (
    <section className="panel panel-emergency" aria-label="Emergency">
      <a className="btn-call" href="tel:115">
        {t('emCall')}
      </a>

      <button type="button" className={`btn-metro ${metronomeOn ? 'on' : ''}`} onClick={onToggleMetronome}>
        {metronomeOn ? `■ ${t('metronomeOff')}` : `▶ ${t('metronomeOn')}`}
        <span className="metro-bpm"> · {METRONOME_BPM} BPM</span>
      </button>

      <h2 className="em-title">{t('emStepsTitle')}</h2>
      <ol className="em-steps">
        <li>{t('emStep1')}</li>
        <li>{t('emStep2')}</li>
        <li>{t('emStep3')}</li>
        <li>{t('emStep4')}</li>
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
