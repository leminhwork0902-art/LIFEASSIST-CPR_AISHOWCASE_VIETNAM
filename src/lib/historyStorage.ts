import type { SessionSummary } from './sessionScorer.ts';

export interface HistoryEntry extends SessionSummary {
  id: string;
  recordedAt: string;
}

const HISTORY_KEY = 'lifeassist.history.v1';
const MAX_ENTRIES = 30;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is HistoryEntry =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as HistoryEntry).id === 'string' &&
        typeof (item as HistoryEntry).recordedAt === 'string' &&
        typeof (item as HistoryEntry).totalCompressions === 'number'
    );
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): HistoryEntry[] {
  const trimmed = entries.slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    /* Bỏ qua nếu trình duyệt chặn localStorage hoặc đầy bộ nhớ */
  }
  return trimmed;
}

export function appendHistory(summary: SessionSummary): HistoryEntry[] {
  const entry: HistoryEntry = {
    ...summary,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    recordedAt: new Date().toISOString(),
  };
  const current = loadHistory();
  return saveHistory([entry, ...current]);
}

export function deleteHistoryEntry(id: string): HistoryEntry[] {
  const next = loadHistory().filter((item) => item.id !== id);
  return saveHistory(next);
}

export function clearHistory(): HistoryEntry[] {
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* bỏ qua */
  }
  return [];
}