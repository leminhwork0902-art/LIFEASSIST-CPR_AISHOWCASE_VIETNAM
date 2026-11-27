import { useState } from 'react';
import type { Lang } from '../lib/audio.ts';
import type { HistoryEntry } from '../lib/historyStorage.ts';
import type { MainIssue } from '../lib/sessionScorer.ts';
import { tr } from '../i18n.ts';
import { IconChevron, IconHistory, IconX } from './Icons.tsx';

interface HistoryPanelProps {
  lang: Lang;
  entries: HistoryEntry[];
  onDelete: (id: string) => void;
  onClear: () => void;
}

const ISSUE_LABELS: Record<Lang, Record<MainIssue, string>> = {
  vi: {
    NONE: 'Đạt chuẩn',
    TOO_SLOW: 'Ép quá chậm',
    TOO_FAST: 'Ép quá nhanh',
    BENT_ELBOW: 'Chùng khuỷu tay',
    OFF_AXIS: 'Lệch trục vai',
  },
  en: {
    NONE: 'Great form',
    TOO_SLOW: 'Too slow',
    TOO_FAST: 'Too fast',
    BENT_ELBOW: 'Bent elbows',
    OFF_AXIS: 'Off-axis shoulders',
  },
};

function formatDateTime(iso: string, lang: Lang): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function HistoryPanel({ lang, entries, onDelete, onClear }: HistoryPanelProps) {
  const t = tr(lang);
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const validSessions = entries.filter((e) => e.enoughData && e.avgBpm !== null);
  const overallAvgBpm =
    validSessions.length > 0
      ? Math.round(validSessions.reduce((acc, cur) => acc + (cur.avgBpm ?? 0), 0) / validSessions.length)
      : null;
  const bestTargetPct =
    validSessions.length > 0 ? Math.max(...validSessions.map((e) => e.bpmInTargetPct ?? 0)) : null;

  const trend = validSessions.slice(0, 10).reverse();

  return (
    <section className="card accordion panel-history" data-open={open}>
      <button
        type="button"
        className="accordion-head"
        aria-expanded={open}
        aria-controls="history-body"
        onClick={() => {
          setOpen((v) => !v);
          setConfirmClear(false);
        }}
      >
        <span className="accordion-icon" aria-hidden="true">
          <IconHistory />
        </span>
        <span className="accordion-title">
          <span>
            {t('histTitle')} <span className="muted num">({entries.length})</span>
          </span>
        </span>
        {overallAvgBpm !== null && (
          <span className="pill tone-info">
            {t('histAvgBpm')}: <span className="num">{overallAvgBpm}</span>
          </span>
        )}
        <IconChevron className="accordion-chevron" />
      </button>

      {open && (
        <div className="accordion-body" id="history-body">
          {entries.length === 0 ? (
            <p className="muted">{t('histEmpty')}</p>
          ) : (
            <>
              <div className="hist-stats">
                <div className="hist-stat">
                  <span className="sum-label">{t('histSessions')}</span>
                  <strong className="num">{entries.length}</strong>
                </div>
                <div className="hist-stat">
                  <span className="sum-label">{t('histAvgBpm')}</span>
                  <strong className="num tone-info">{overallAvgBpm ?? '—'}</strong>
                </div>
                <div className="hist-stat">
                  <span className="sum-label">{t('histBest')}</span>
                  <strong className="num tone-good">{bestTargetPct !== null ? `${bestTargetPct}%` : '—'}</strong>
                </div>
              </div>

              {trend.length > 1 && (
                <div className="hist-trend">
                  <span className="sum-label">{t('histTrend')}</span>
                  <div className="hist-bars" role="img" aria-label={t('histTrend')}>
                    {trend.map((e) => {
                      const v = e.bpmInTargetPct ?? 0;
                      const tone = v >= 70 ? 'good' : v >= 40 ? 'warn' : 'bad';
                      return (
                        <span key={e.id} className="hist-bar" title={`${v}%`}>
                          <span className={`hist-bar-fill tone-${tone}`} style={{ height: `${Math.max(4, v)}%` }} />
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <ul className="hist-list">
                {entries.map((item) => {
                  const tone = !item.enoughData ? 'idle' : item.mainIssue === 'NONE' ? 'good' : 'warn';
                  const badgeText = !item.enoughData ? t('histShort') : ISSUE_LABELS[lang][item.mainIssue];
                  return (
                    <li key={item.id} className="hist-item">
                      <div className="hist-item-main">
                        <div className="hist-item-head">
                          <span className="muted num">{formatDateTime(item.recordedAt, lang)}</span>
                          <span className={`pill tone-${tone}`}>{badgeText}</span>
                        </div>
                        <dl className="hist-item-metrics">
                          <div>
                            <dt>{t('histCompressions')}</dt>
                            <dd className="num">{item.totalCompressions}</dd>
                          </div>
                          <div>
                            <dt>BPM</dt>
                            <dd className="num">{item.avgBpm !== null ? item.avgBpm : '—'}</dd>
                          </div>
                          <div>
                            <dt>{t('histTarget')}</dt>
                            <dd className="num">{item.bpmInTargetPct !== null ? `${item.bpmInTargetPct}%` : '—'}</dd>
                          </div>
                          <div>
                            <dt>{t('histPosture')}</dt>
                            <dd className="num">{item.goodPosturePct !== null ? `${item.goodPosturePct}%` : '—'}</dd>
                          </div>
                        </dl>
                      </div>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => onDelete(item.id)}
                        title={t('histDelete')}
                        aria-label={t('histDelete')}
                      >
                        <IconX size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="hist-footer">
                {!confirmClear ? (
                  <button type="button" className="btn btn-ghost btn-sm danger-text" onClick={() => setConfirmClear(true)}>
                    {t('histClearAll')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        onClear();
                        setConfirmClear(false);
                      }}
                    >
                      {t('histConfirm')}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(false)}>
                      {t('histCancel')}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
