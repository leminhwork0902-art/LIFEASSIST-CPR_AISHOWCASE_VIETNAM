import type { SessionSummary } from './sessionScorer.ts';

const SHEETS_WEBHOOK_URL: string =
  import.meta.env.VITE_SHEETS_WEBHOOK_URL ??
  'https://script.google.com/macros/s/AKfycbwazbTyHtJsMw_J8oMCUlVPkGzskmP_uMl2E3BoY9l0KK6WUotCn9TnK8dFOsgisFb-ig/exec';

function pickField(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const val = obj[k];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

export async function syncSessionToSheets(
  summary: SessionSummary,
  meta?: object
): Promise<void> {
  if (!SHEETS_WEBHOOK_URL.startsWith('https://')) return;

  const m = (meta ?? {}) as Record<string, unknown>;

  const payload = {
    recordedAt: new Date().toLocaleString('vi-VN'),
    subjectId: pickField(m, ['subjectId']),
    group: pickField(m, ['subjectGroup', 'group', 'label']),
    angle: pickField(m, ['angle', 'cameraAngle']),
    target: pickField(m, ['targetBpm', 'target', 'lighting']),
    notes: pickField(m, ['notes', 'note', 'device']),
    ...summary,
  };

  try {
    await fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Bỏ qua lỗi mạng để không ảnh hưởng bài tập; dữ liệu vẫn lưu ở localStorage
  }
}