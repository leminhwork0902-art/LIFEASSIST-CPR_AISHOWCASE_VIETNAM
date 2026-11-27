// Mọi hằng số "con số" của hệ thống nằm ở đây để dễ giải thích với giám khảo
// và dễ hiệu chỉnh sau khi có dữ liệu thật.

export const APP_VERSION = '0.2.0 (24/11)';

/** Khoảng nhịp ép mục tiêu (lần/phút). Nguồn: AHA 2025 Guidelines, Part 7 Adult BLS. */
export const TARGET_BPM_MIN = 100;
export const TARGET_BPM_MAX = 120;

/** Nhịp metronome ở chế độ Khẩn cấp (nằm giữa 100–120). */
export const METRONOME_BPM = 110;

/**
 * Ngưỡng tư thế ban đầu — CON SỐ ĐOÁN, chưa hiệu chỉnh từ dữ liệu.
 * Chỉ được gọi là "hiệu chỉnh từ dữ liệu" sau khi chạy ml/train_classifier.py.
 */
export const ELBOW_MIN_DEG = 160;
export const SHOULDER_OFFSET_MAX = 0.28;

/** Độ hiển thị tối thiểu (0–1) của vai–khuỷu–cổ tay để khung hình được dùng. */
export const MIN_ARM_VISIBILITY = 0.5;

export const COUNTDOWN_SECONDS = 3;
export const SESSION_SECONDS = 30;

/** Dưới ngưỡng này (ms ép thực sự) thì không in phần trăm, tránh số liệu vô nghĩa. */
export const MIN_COMPRESSING_MS_FOR_SCORE = 5000;

/** Tần số cập nhật giao diện (ms). Xử lý khung hình vẫn chạy full tốc độ. */
export const HUD_INTERVAL_MS = 120;
