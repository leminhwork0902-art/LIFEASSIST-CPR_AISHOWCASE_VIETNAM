#!/usr/bin/env python3
"""
Đo sai số đếm nhịp của thuật toán trong app so với nhịp THẬT.

Nhịp thật (ground truth) = cột gt_tap: người thứ hai bấm phím Cách mỗi lần thấy một nhịp ép.
Nhịp do AI = cột detected_peak (do chính bộ đếm trong app ghi lại khi chạy).

Cách dùng:
    python ml/eval_bpm.py --data ml/data
    # kết quả: ml/results/bpm_eval.md

Lưu ý quan trọng:
  * Độ trễ phản xạ của người bấm làm lệch THỜI ĐIỂM từng nhịp nhưng gần như không ảnh hưởng
    BPM (BPM chỉ phụ thuộc khoảng cách giữa các nhịp). Script ước lượng và loại độ lệch này
    trước khi ghép cặp nhịp.
  * Người bấm cũng có thể bỏ sót/bấm thừa. Hãy đối chiếu ngẫu nhiên vài phiên với video đếm tay
    (không lưu mặt) và ghi số phiên đã kiểm tra vào hồ sơ.
  * Tuyệt đối không dùng tiếng bíp metronome làm chuẩn: người tập có thể lệch khỏi bíp.
"""
from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

from common import ROOT, SYNTH_BANNER, load_csvs

MIN_EVENTS = 6  # số nhịp thật tối thiểu để tính một phiên


def bpm_from_times(t_ms: np.ndarray) -> float | None:
    if len(t_ms) < 3:
        return None
    span = t_ms[-1] - t_ms[0]
    return (len(t_ms) - 1) * 60000.0 / span if span > 0 else None


def window_bpm_pairs(gt: np.ndarray, det: np.ndarray, win_ms=5000, step_ms=1000) -> list[tuple[float, float]]:
    """So BPM trong các cửa sổ 5 s trượt 1 s (cả hai phía phải có ≥ 3 nhịp)."""
    if len(gt) == 0:
        return []
    out = []
    t = gt[0]
    while t + win_ms <= gt[-1] + 1:
        g = gt[(gt >= t) & (gt < t + win_ms)]
        d = det[(det >= t) & (det < t + win_ms)]
        bg, bd = bpm_from_times(g), bpm_from_times(d)
        if bg is not None and bd is not None:
            out.append((bg, bd))
        t += step_ms
    return out


def match_events(gt: np.ndarray, det: np.ndarray, tol_ms=250) -> tuple[int, float]:
    """Loại độ lệch trung vị (độ trễ người bấm) rồi ghép cặp gần nhất. Trả về (số cặp, lag trung vị)."""
    if len(gt) == 0 or len(det) == 0:
        return 0, 0.0
    nearest = np.array([det[np.argmin(np.abs(det - g))] - g for g in gt])
    lag = float(np.median(nearest))
    used = set()
    matched = 0
    for g in gt:
        j = int(np.argmin(np.abs(det - (g + lag))))
        if j not in used and abs(det[j] - (g + lag)) <= tol_ms:
            used.add(j)
            matched += 1
    return matched, lag


def md_table(rows, header):
    out = ["| " + " | ".join(header) + " |", "|" + "|".join("---" for _ in header) + "|"]
    out += ["| " + " | ".join(map(str, r)) + " |" for r in rows]
    return "\n".join(out)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="ml/data")
    ap.add_argument("--tolerance-bpm", type=float, default=5.0, help="ngưỡng 'đạt' để báo % phiên trong ±X BPM")
    ap.add_argument("--report-out", default=str(ROOT / "ml" / "results" / "bpm_eval.md"))
    args = ap.parse_args()

    df, synthetic = load_csvs(args.data)
    if synthetic:
        print(SYNTH_BANNER)

    rows = []
    amps = []
    for sid, g in df.groupby("session_id"):
        g = g.sort_values("t_ms")
        gt = g.loc[g["gt_tap"] == 1, "t_ms"].to_numpy()
        det = g.loc[g["detected_peak"] == 1, "t_ms"].to_numpy()
        if len(gt) < MIN_EVENTS:
            continue
        bg, bd = bpm_from_times(gt), bpm_from_times(det)
        matched, lag = match_events(gt, det)
        wins = window_bpm_pairs(gt, det - lag)
        win_mae = float(np.mean([abs(a - b) for a, b in wins])) if wins else float("nan")
        first = g.iloc[0]
        rows.append({
            "session": sid, "subject": first["subject_id"], "camera": first["camera_angle"],
            "light": first["lighting"], "device": first["device"],
            "n_gt": len(gt), "n_det": len(det),
            "count_err_pct": (len(det) - len(gt)) / len(gt) * 100,
            "bpm_gt": bg, "bpm_det": bd,
            "bpm_err": (bd - bg) if (bd is not None and bg is not None) else np.nan,
            "precision": matched / len(det) if len(det) else 0.0,
            "recall": matched / len(gt),
            "win_mae": win_mae, "lag_ms": lag,
        })
        # biên độ tín hiệu giữa các nhịp thật → gợi ý minProminence
        for a, b in zip(gt[:-1], gt[1:]):
            seg = g.loc[(g["t_ms"] >= a) & (g["t_ms"] < b), "wrist_y_smooth"]
            if len(seg) >= 3:
                amps.append(float(seg.max() - seg.min()))

    if not rows:
        raise SystemExit(f"Không có phiên nào có ≥ {MIN_EVENTS} lần bấm gt_tap. Cần ghi kèm gt_tap khi thu dữ liệu.")
    r = pd.DataFrame(rows)

    def stats(x: pd.Series) -> str:
        x = x.dropna().abs()
        return f"MAE {x.mean():.1f} · trung vị {x.median():.1f} · lớn nhất {x.max():.1f}"

    within = (r["bpm_err"].abs() <= args.tolerance_bpm).mean() * 100
    lines = []
    if synthetic:
        lines += [f"> **{SYNTH_BANNER}**", ""]
    lines += [
        "# Đánh giá sai số đếm nhịp (so với nhịp thật bấm tay)",
        "",
        f"- Ngày chạy: {date.today().isoformat()}",
        f"- Số phiên: **{len(r)}**; số người: **{r['subject'].nunique()}**; số nhịp thật: **{int(r['n_gt'].sum())}**",
        f"- Sai số BPM theo phiên (|AI − thật|): {stats(r['bpm_err'])}",
        f"- Sai số BPM theo cửa sổ 5 s: MAE trung bình {r['win_mae'].mean():.1f}",
        f"- Phiên có sai số trong ±{args.tolerance_bpm:g} BPM: **{within:.0f}%**",
        f"- Sai lệch số lần đếm: trung bình {r['count_err_pct'].mean():+.1f}% (dương = AI đếm thừa)",
        f"- Ghép cặp nhịp: precision {r['precision'].mean():.2f}, recall {r['recall'].mean():.2f}",
        "",
        "## Theo điều kiện (MAE BPM theo phiên)",
        "",
    ]
    for col, name in [("camera", "Góc máy"), ("light", "Ánh sáng"), ("device", "Thiết bị")]:
        t = r.groupby(col).agg(phien=("session", "count"), nguoi=("subject", "nunique"),
                               mae=("bpm_err", lambda x: x.abs().mean()), recall=("recall", "mean"))
        lines += [f"**{name}**", "", md_table([[i, int(v.phien), int(v.nguoi), f"{v.mae:.1f}", f"{v.recall:.2f}"] for i, v in t.iterrows()],
                                              [name, "Phiên", "Người", "MAE BPM", "Recall"]), ""]

    worst = r.reindex(r["bpm_err"].abs().sort_values(ascending=False).index).head(5)
    lines += [
        "## 5 phiên sai nhiều nhất (ghi lại trường hợp thất bại)", "",
        md_table([[w.session[:28], w.camera, w.light, w.device, f"{w.bpm_gt:.0f}", f"{w.bpm_det:.0f}", f"{w.bpm_err:+.1f}"] for w in worst.itertuples()],
                 ["Phiên", "Góc", "Sáng", "Thiết bị", "BPM thật", "BPM AI", "Sai số"]), "",
    ]
    if amps:
        p = np.percentile(amps, [10, 50, 90])
        lines += [
            "## Biên độ chuyển động cổ tay giữa hai nhịp (đơn vị = chiều dài thân)", "",
            f"- p10 = {p[0]:.3f}, trung vị = {p[1]:.3f}, p90 = {p[2]:.3f}",
            f"- `minProminence` hiện tại = 0.04 (src/lib/cprDetector.ts). Nếu p10 < 0.08 thì ngưỡng này quá sát: "
            f"những nhịp nông sẽ bị bỏ sót. Gợi ý: đặt ≈ 0.4–0.5 × p10 rồi thu lại một lượt để kiểm chứng.",
            "",
        ]
    lines += [
        "## Lưu ý", "",
        "- Chuẩn đối chiếu là người bấm phím; hãy kiểm tra chéo vài phiên với video đếm tay và ghi số phiên đã kiểm.",
        "- Chỉ báo kết quả cho đúng các điều kiện đã thử (góc máy, ánh sáng, thiết bị trong bảng trên).",
    ]
    out = Path(args.report_out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"\nĐã ghi báo cáo: {out}")


if __name__ == "__main__":
    main()
