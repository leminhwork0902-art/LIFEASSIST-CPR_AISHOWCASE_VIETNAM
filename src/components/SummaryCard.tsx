import type { T, StringKey } from '../i18n.ts';
import type { SessionSummary } from '../lib/sessionScorer.ts';
import { IconAward, IconFilm, IconRotate, IconX } from './Icons.tsx';

interface Props {
  t: T;
  s: SessionSummary;
  onPracticeAgain?: () => void;
  onClose?: () => void;
  onReviewVideo?: () => void;
}

const pct = (v: number | null) => (v === null ? '—' : `${v}%`);

function Progress({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  const tone = value === null ? 'idle' : v >= 70 ? 'good' : v >= 40 ? 'warn' : 'bad';
  return (
    <div className="sum-progress">
      <div className="sum-progress-head">
        <span className="sum-label">{label}</span>
        <strong className={`num tone-${tone}`}>{pct(value)}</strong>
      </div>
      <div
        className="sum-bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? undefined}
      >
        <span className={`sum-bar-fill tone-${tone}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function SummaryCard({ t, s, onPracticeAgain, onClose, onReviewVideo }: Props) {
  const rating = !s.enoughData
    ? { key: 'sumRatingNoData' as StringKey, tone: 'idle' }
    : s.mainIssue === 'NONE'
      ? { key: 'sumRatingGood' as StringKey, tone: 'good' }
      : { key: 'sumRatingImprove' as StringKey, tone: 'warn' };

  return (
    <section className="panel-summary" aria-live="polite" aria-labelledby="sum-title">
      <header className="sum-header">
        <div className={`sum-emblem tone-${rating.tone}`} aria-hidden="true">
          <IconAward size={26} />
        </div>
        <div className="sum-heading">
          <h2 id="sum-title">{t('sumTitle')}</h2>
          <span className={`pill tone-${rating.tone}`}>{t(rating.key)}</span>
        </div>
        {onClose && (
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('close')}>
            <IconX />
          </button>
        )}
      </header>

      <div className="sum-tiles">
        <div className="sum-tile">
          <span className="sum-label">{t('sumCompressions')}</span>
          <strong className="num">{s.totalCompressions}</strong>
        </div>
        <div className="sum-tile">
          <span className="sum-label">{t('sumAvgBpm')}</span>
          <strong className="num">
            {s.avgBpm === null ? '—' : s.avgBpm}
            {s.avgBpm !== null && <small> BPM</small>}
          </strong>
        </div>
        <div className="sum-tile">
          <span className="sum-label">{t('sumActive')}</span>
          <strong className="num">{s.compressingPct}%</strong>
        </div>
        <div className="sum-tile">
          <span className="sum-label">{t('sumDuration')}</span>
          <strong className="num">
            {Math.round(s.durationSec)}
            <small> s</small>
          </strong>
        </div>
      </div>

      <div className="sum-progress-group">
        <Progress label={t('sumInTarget')} value={s.bpmInTargetPct} />
        <Progress label={t('sumPosture')} value={s.goodPosturePct} />
      </div>

      <div className={`sum-issue tone-${rating.tone}`}>
        <span className="sum-label">{t('sumMainIssue')}</span>
        <strong>{s.enoughData ? t(`issue${s.mainIssue}` as StringKey) : '—'}</strong>
      </div>

      {!s.enoughData && <p className="sum-note warn">{t('sumNotEnough')}</p>}
      <p className="sum-note">{t('sumDisclaimer')}</p>

      {(onPracticeAgain || onReviewVideo) && (
        <div className="sum-actions">
          {onPracticeAgain && (
            <button type="button" className="btn btn-primary" onClick={onPracticeAgain}>
              <IconRotate />
              {t('sumPracticeAgain')}
            </button>
          )}
          {onReviewVideo && (
            <button type="button" className="btn btn-secondary" onClick={onReviewVideo}>
              <IconFilm />
              {t('sumReviewVideo')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
