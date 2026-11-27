import type { T } from '../i18n.ts';
import type { PostureLabel } from '../lib/posture.ts';
import type { CameraAngle, Lighting, RecorderMeta } from '../lib/csvRecorder.ts';
import { IconChevron, IconDownload, IconFlask, IconRecord, IconStop, IconTrash } from './Icons.tsx';

interface Props {
  t: T;
  meta: RecorderMeta;
  onMeta: (m: RecorderMeta) => void;
  isRecording: boolean;
  rows: number;
  taps: number;
  onToggle: () => void;
  onTap: () => void;
  onDownload: () => void;
  onClear: () => void;
}

export function RecorderPanel({ t, meta, onMeta, isRecording, rows, taps, onToggle, onTap, onDownload, onClear }: Props) {
  const set = <K extends keyof RecorderMeta>(k: K, v: RecorderMeta[K]) => onMeta({ ...meta, [k]: v });
  return (
    <details className="card accordion panel-rec">
      <summary className="accordion-head">
        <span className="accordion-icon" aria-hidden="true">
          <IconFlask />
        </span>
        <span className="accordion-title">
          <span className="eyebrow">{t('recSectionTag')}</span>
          <span>{t('recTitle')}</span>
        </span>
        {isRecording && (
          <span className="pill tone-bad rec-live">
            <span className="rec-dot" aria-hidden="true" />
            <span className="num">{rows}</span> {t('recRows')}
          </span>
        )}
        <IconChevron className="accordion-chevron" />
      </summary>

      <div className="accordion-body">
        <p className="rec-help">{t('recHelp')}</p>

        <div className="rec-grid">
          <label className="field">
            <span className="field-label">{t('recSubject')}</span>
            <input type="text" value={meta.subjectId} onChange={(e) => set('subjectId', e.target.value)} disabled={isRecording} />
          </label>
          <label className="field">
            <span className="field-label">{t('recLabel')}</span>
            <select value={meta.label} onChange={(e) => set('label', e.target.value as PostureLabel)}>
              <option value="CORRECT_POSTURE">{t('recLabelCorrect')}</option>
              <option value="BENT_ELBOW">{t('recLabelBent')}</option>
              <option value="OFF_AXIS">{t('recLabelOff')}</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('recAngle')}</span>
            <select value={meta.cameraAngle} onChange={(e) => set('cameraAngle', e.target.value as CameraAngle)}>
              <option value="SIDE_90">{t('recAngleSide')}</option>
              <option value="DIAGONAL_45">{t('recAngleDiag')}</option>
              <option value="FRONT_0">{t('recAngleFront')}</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('recLight')}</span>
            <select value={meta.lighting} onChange={(e) => set('lighting', e.target.value as Lighting)}>
              <option value="BRIGHT">{t('recLightBright')}</option>
              <option value="DIM">{t('recLightDim')}</option>
            </select>
          </label>
          <label className="field span2">
            <span className="field-label">{t('recDevice')}</span>
            <input type="text" value={meta.device} onChange={(e) => set('device', e.target.value)} disabled={isRecording} />
          </label>
        </div>

        <div className="rec-actions">
          <button type="button" className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`} onClick={onToggle}>
            {isRecording ? <IconStop /> : <IconRecord />}
            {isRecording ? (
              <>
                {t('recStop')} (<span className="num">{rows}</span> {t('recRows')})
              </>
            ) : (
              t('recStart')
            )}
          </button>
          {!isRecording && rows > 0 && (
            <>
              <button type="button" className="btn btn-secondary" onClick={onDownload}>
                <IconDownload />
                {t('recDownload')} (<span className="num">{rows}</span>)
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClear}>
                <IconTrash />
                {t('recClear')}
              </button>
            </>
          )}
        </div>

        {isRecording && (
          <div className="rec-tap">
            <button type="button" className="btn-tap" onPointerDown={onTap}>
              <span>{t('recTap')}</span>
              <span className="btn-tap-count num">
                {taps} <small>{t('recTapCount')}</small>
              </span>
            </button>
            <p className="rec-help">{t('recTapHelp')}</p>
          </div>
        )}
      </div>
    </details>
  );
}
