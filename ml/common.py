"""Tiện ích dùng chung cho các script đánh giá của LifeAssist CPR."""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CONFIG_TS = ROOT / "src" / "lib" / "config.ts"

REQUIRED_COLS = [
    "session_id", "subject_id", "label", "camera_angle", "lighting", "device", "t_ms",
    "elbow_angle_deg", "shoulder_wrist_offset_norm", "wrist_y_norm", "wrist_y_smooth",
    "arm_visibility", "fps", "is_compressing", "detected_peak", "gt_tap",
]

SYNTH_BANNER = (
    "!!! DỮ LIỆU TỔNG HỢP (SYNTHETIC) — chỉ để thử đường ống. KHÔNG phải kết quả thực nghiệm, "
    "KHÔNG được đưa vào hồ sơ/slide/video. !!!"
)


def read_ts_const(name: str) -> float:
    """Đọc hằng số từ src/lib/config.ts để script và app luôn dùng cùng một ngưỡng."""
    text = CONFIG_TS.read_text(encoding="utf-8")
    m = re.search(rf"export const {name}\s*=\s*([0-9.]+)", text)
    if not m:
        raise SystemExit(f"Không tìm thấy {name} trong {CONFIG_TS}")
    return float(m.group(1))


def load_csvs(data_dir: str | Path) -> tuple[pd.DataFrame, bool]:
    """Gộp mọi file *.csv trong thư mục. Trả về (DataFrame, is_synthetic)."""
    data_dir = Path(data_dir)
    files = sorted(data_dir.rglob("*.csv"))
    if not files:
        raise SystemExit(f"Không có file .csv nào trong {data_dir}")
    frames = []
    synthetic = False
    for f in files:
        df = pd.read_csv(f)
        missing = [c for c in REQUIRED_COLS if c not in df.columns]
        if missing:
            print(f"  bỏ qua {f.name}: thiếu cột {missing} (xuất từ phiên bản app cũ?)", file=sys.stderr)
            continue
        df["source_file"] = f.name
        # Một file có thể chứa nhiều phiên ghi; session_id đã đủ phân biệt, nhưng thêm tên file cho chắc
        df["session_id"] = f.stem + ":" + df["session_id"].astype(str)
        if f.name.upper().startswith("SYNTHETIC"):
            synthetic = True
        frames.append(df)
    if not frames:
        raise SystemExit("Không có file nào hợp lệ.")
    out = pd.concat(frames, ignore_index=True)
    out["subject_id"] = out["subject_id"].astype(str)
    return out, synthetic
