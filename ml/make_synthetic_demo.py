#!/usr/bin/env python3
"""
Sinh dữ liệu GIẢ (SYNTHETIC) chỉ để thử đường ống train_classifier.py / eval_bpm.py.
Các file tạo ra bắt đầu bằng 'SYNTHETIC_' để hai script kia tự nhận ra và từ chối
xuất mô hình vào app. KHÔNG BAO GIỜ đưa số liệu từ dữ liệu này vào hồ sơ.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from common import REQUIRED_COLS

rng = np.random.default_rng(2026)
OUT = Path(__file__).resolve().parent / "_synthetic"
OUT.mkdir(exist_ok=True)

LABEL_PARAMS = {  # (góc khuỷu TB, sd, lệch vai TB, sd) — tự bịa, chỉ để thử code
    "CORRECT_POSTURE": (168, 6, 0.15, 0.07),
    "BENT_ELBOW": (135, 14, 0.18, 0.08),
    "OFF_AXIS": (167, 6, 0.45, 0.12),
}

for s in range(1, 11):
    subj = f"SYN{s:02d}"
    bias_a, bias_o = rng.normal(0, 4), rng.normal(0, 0.03)
    rows = []
    for k, (label, (ma, sa, mo, so)) in enumerate(LABEL_PARAMS.items()):
        for cam in ["SIDE_90", "DIAGONAL_45"]:
            bpm = rng.uniform(95, 130)
            fps = 30
            t = np.arange(0, 20000, 1000 / fps)
            f = bpm / 60
            y = 0.5 + 0.05 * (1 - np.cos(2 * np.pi * f * t / 1000)) + rng.normal(0, 0.008, len(t))
            peak_t = np.arange(0.5 * 1000 / f, 20000, 1000 / f)  # đáy hành trình
            tap_t = peak_t + rng.normal(120, 30, len(peak_t))
            keep = rng.random(len(peak_t)) > 0.03  # người bấm bỏ sót ~3%
            det_t = peak_t + rng.normal(60, 15, len(peak_t))
            keep_d = rng.random(len(peak_t)) > (0.02 if cam == "SIDE_90" else 0.10)
            cam_noise = 1.0 if cam == "SIDE_90" else 1.6
            df = pd.DataFrame({
                "session_id": f"rec_{s}_{k}_{cam}", "subject_id": subj, "label": label,
                "camera_angle": cam, "lighting": "BRIGHT", "device": "SyntheticPhone",
                "t_ms": t,
                "elbow_angle_deg": rng.normal(ma + bias_a, sa * cam_noise, len(t)),
                "shoulder_wrist_offset_norm": np.abs(rng.normal(mo + bias_o, so * cam_noise, len(t))),
                "wrist_y_norm": y, "wrist_y_smooth": y, "arm_visibility": rng.uniform(0.6, 1, len(t)),
                "fps": fps, "is_compressing": (t > 2000).astype(int),
                "detected_peak": 0, "gt_tap": 0,
            })
            df.loc[np.abs(df["t_ms"].to_numpy()[:, None] - tap_t[keep][None, :]).argmin(axis=0), "gt_tap"] = 1
            df.loc[np.abs(df["t_ms"].to_numpy()[:, None] - det_t[keep_d][None, :]).argmin(axis=0), "detected_peak"] = 1
            rows.append(df)
    pd.concat(rows)[REQUIRED_COLS].to_csv(OUT / f"SYNTHETIC_{subj}.csv", index=False)

print(f"Đã tạo dữ liệu SYNTHETIC trong {OUT}. Chỉ để thử đường ống — KHÔNG phải kết quả thực nghiệm.")
