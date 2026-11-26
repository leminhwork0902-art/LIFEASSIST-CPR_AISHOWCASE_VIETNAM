import type { T, StringKey } from '../i18n.ts';
import type { SessionSummary } from '../lib/sessionScorer.ts';

interface Props {
  t: T;
  s: SessionSummary;
}

const pct = (v: number | null) => (v === null ? '—' : `${v}%`);

export function SummaryCard({ t, s }: Props) {
  return (
    <section className="panel panel-summary" aria-live="polite">
      <h2>{t('sumTitle')}</h2>
      <div className="sum-grid">
        <div>
          <span className="sum-label">{t('sumCompressions')}</span>
          <strong>{s.totalCompressions}</strong>
        </div>
        <div>
          <span className="sum-label">{t('sumActive')}</span>
          <strong>{s.compressingPct}%</strong>
        </div>
        <div>
          <span className="sum-label">{t('sumAvgBpm')}</span>
          <strong>{s.avgBpm === null ? '—' : `${s.avgBpm} BPM`}</strong>
        </div>
        <div>
          <span className="sum-label">{t('sumInTarget')}</span>
          <strong>{pct(s.bpmInTargetPct)}</strong>
        </div>
        <div>
          <span className="sum-label">{t('sumPosture')}</span>
          <strong>{pct(s.goodPosturePct)}</strong>
        </div>
        <div>
          <span className="sum-label">{t('sumMainIssue')}</span>
          <strong>{s.enoughData ? t(`issue${s.mainIssue}` as StringKey) : '—'}</strong>
        </div>
      </div>
      {!s.enoughData && <p className="sum-note warn">{t('sumNotEnough')}</p>}
      <p className="sum-note">{t('sumDisclaimer')}</p>
    </section>
  );
}
