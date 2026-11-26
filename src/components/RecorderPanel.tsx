import type { T } from '../i18n.ts';
import type { PostureLabel } from '../lib/posture.ts';
import type { CameraAngle, Lighting, RecorderMeta } from '../lib/csvRecorder.ts';

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
    <details className="panel panel-rec">
      <summary>{t('recTitle')}</summary>
      <p className="rec-help">{t('recHelp')}</p>

      <div className="rec-grid">
        <label>
          {t('recSubject')}
          <input type="text" value={meta.subjectId} onChange={(e) => set('subjectId', e.target.value)} disabled={isRecording} />
        </label>
        <label>
          {t('recLabel')}
          <select value={meta.label} onChange={(e) => set('label', e.target.value as PostureLabel)}>
            <option value="CORRECT_POSTURE">{t('recLabelCorrect')}</option>
            <option value="BENT_ELBOW">{t('recLabelBent')}</option>
            <option value="OFF_AXIS">{t('recLabelOff')}</option>
          </select>
        </label>
        <label>
          {t('recAngle')}
          <select value={meta.cameraAngle} onChange={(e) => set('cameraAngle', e.target.value as CameraAngle)}>
            <option value="SIDE_90">{t('recAngleSide')}</option>
            <option value="DIAGONAL_45">{t('recAngleDiag')}</option>
            <option value="FRONT_0">{t('recAngleFront')}</option>
          </select>
        </label>
        <label>
          {t('recLight')}
          <select value={meta.lighting} onChange={(e) => set('lighting', e.target.value as Lighting)}>
            <option value="BRIGHT">{t('recLightBright')}</option>
            <option value="DIM">{t('recLightDim')}</option>
          </select>
        </label>
        <label className="span2">
          {t('recDevice')}
          <input type="text" value={meta.device} onChange={(e) => set('device', e.target.value)} disabled={isRecording} />
        </label>
      </div>

      <div className="rec-actions">
        <button type="button" className={isRecording ? 'btn-danger' : 'btn-primary'} onClick={onToggle}>
          {isRecording ? `■ ${t('recStop')} (${rows} ${t('recRows')})` : `● ${t('recStart')}`}
        </button>
        {!isRecording && rows > 0 && (
          <>
            <button type="button" className="btn-secondary" onClick={onDownload}>
              {t('recDownload')} ({rows})
            </button>
            <button type="button" className="btn-ghost" onClick={onClear}>
              {t('recClear')}
            </button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="rec-tap">
          <button type="button" className="btn-tap" onPointerDown={onTap}>
            {t('recTap')} · {taps}
          </button>
          <p className="rec-help">{t('recTapHelp')}</p>
        </div>
      )}
    </details>
  );
}
