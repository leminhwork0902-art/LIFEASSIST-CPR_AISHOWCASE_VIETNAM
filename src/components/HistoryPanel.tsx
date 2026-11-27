import { useState } from 'react';
import type { Lang } from '../lib/audio.ts';
import type { HistoryEntry } from '../lib/historyStorage.ts';
import type { MainIssue } from '../lib/sessionScorer.ts';

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

export function HistoryPanel({
  lang,
  entries,
  onDelete,
  onClear,
}: HistoryPanelProps) {
  const isEn = lang === 'en';
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const validSessions = entries.filter((e) => e.enoughData && e.avgBpm !== null);
  const overallAvgBpm =
    validSessions.length > 0
      ? Math.round(
          validSessions.reduce((acc, cur) => acc + (cur.avgBpm ?? 0), 0) /
            validSessions.length
        )
      : null;
  const bestTargetPct =
    validSessions.length > 0
      ? Math.max(...validSessions.map((e) => e.bpmInTargetPct ?? 0))
      : null;

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 12,
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setConfirmClear(false);
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'transparent',
          border: 'none',
          color: '#e2e8f0',
          fontSize: 13.5,
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>
          {open ? '▾' : '▸'}{' '}
          {isEn
            ? `Practice History (${entries.length})`
            : `Lịch sử tập luyện (${entries.length})`}
        </span>
        {overallAvgBpm !== null && (
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
            {isEn ? 'Avg:' : 'TB:'} {overallAvgBpm} BPM
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            padding: '0 14px 14px',
            borderTop: '1px solid rgba(148, 163, 184, 0.12)',
          }}
        >
          {entries.length === 0 ? (
            <p
              style={{
                margin: '12px 0 0',
                fontSize: 13,
                color: '#94a3b8',
              }}
            >
              {isEn
                ? 'No sessions saved yet. Complete a 30-second practice session to record your progress.'
                : 'Chưa có buổi tập nào được lưu. Hoàn thành một bài tập 30 giây để lưu kết quả tại đây.'}
            </p>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '10px 0',
                  fontSize: 12,
                  color: '#cbd5e1',
                }}
              >
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <span>
                    {isEn ? 'Sessions:' : 'Số buổi:'}{' '}
                    <strong style={{ color: '#fff' }}>{entries.length}</strong>
                  </span>
                  {overallAvgBpm !== null && (
                    <span>
                      {isEn ? 'Avg BPM:' : 'BPM trung bình:'}{' '}
                      <strong style={{ color: '#38bdf8' }}>
                        {overallAvgBpm}
                      </strong>
                    </span>
                  )}
                  {bestTargetPct !== null && (
                    <span>
                      {isEn ? 'Best target rate:' : 'Đạt nhịp cao nhất:'}{' '}
                      <strong style={{ color: '#4ade80' }}>
                        {bestTargetPct}%
                      </strong>
                    </span>
                  )}
                </div>

                {!confirmClear ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#fca5a5',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11.5,
                      cursor: 'pointer',
                    }}
                  >
                    {isEn ? 'Clear all' : 'Xóa tất cả'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        onClear();
                        setConfirmClear(false);
                      }}
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {isEn ? 'Confirm' : 'Xác nhận xóa'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        color: '#cbd5e1',
                        border: 'none',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: 11.5,
                        cursor: 'pointer',
                      }}
                    >
                      {isEn ? 'Cancel' : 'Hủy'}
                    </button>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: 260,
                  overflowY: 'auto',
                }}
              >
                {entries.map((item) => {
                  const isGood = item.enoughData && item.mainIssue === 'NONE';
                  const badgeBg = !item.enoughData
                    ? 'rgba(148, 163, 184, 0.18)'
                    : isGood
                      ? 'rgba(74, 222, 128, 0.18)'
                      : 'rgba(251, 191, 36, 0.18)';
                  const badgeColor = !item.enoughData
                    ? '#cbd5e1'
                    : isGood
                      ? '#4ade80'
                      : '#fbbf24';
                  const badgeText = !item.enoughData
                    ? isEn
                      ? 'Short session'
                      : 'Chưa đủ dữ liệu'
                    : ISSUE_LABELS[lang][item.mainIssue];

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: 'rgba(30, 41, 59, 0.7)',
                        border: '1px solid rgba(148, 163, 184, 0.14)',
                        fontSize: 12.5,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ color: '#94a3b8', fontSize: 11.5 }}>
                            {formatDateTime(item.recordedAt, lang)}
                          </span>
                          <span
                            style={{
                              padding: '1px 7px',
                              borderRadius: 999,
                              background: badgeBg,
                              color: badgeColor,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {badgeText}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: 12,
                            flexWrap: 'wrap',
                            color: '#e2e8f0',
                          }}
                        >
                          <span>
                            {isEn ? 'Compressions:' : 'Số lần ép:'}{' '}
                            <strong>{item.totalCompressions}</strong>
                          </span>
                          <span>
                            BPM:{' '}
                            <strong>
                              {item.avgBpm !== null ? item.avgBpm : '-'}
                            </strong>
                          </span>
                          <span>
                            {isEn ? '100–120 BPM:' : 'Đạt nhịp:'}{' '}
                            <strong>
                              {item.bpmInTargetPct !== null
                                ? `${item.bpmInTargetPct}%`
                                : '-'}
                            </strong>
                          </span>
                          <span>
                            {isEn ? 'Good posture:' : 'Tư thế tốt:'}{' '}
                            <strong>
                              {item.goodPosturePct !== null
                                ? `${item.goodPosturePct}%`
                                : '-'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        title={isEn ? 'Delete entry' : 'Xóa buổi này'}
                        aria-label={isEn ? 'Delete entry' : 'Xóa buổi này'}
                        style={{
                          background: 'transparent',
                          color: '#94a3b8',
                          border: 'none',
                          padding: '4px 6px',
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}