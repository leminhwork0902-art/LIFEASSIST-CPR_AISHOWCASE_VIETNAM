#!/usr/bin/env python3
"""
Huấn luyện + đánh giá bộ phân loại tư thế (hồi quy logistic đa lớp) bằng
LEAVE-ONE-PERSON-OUT, và so với baseline ngưỡng cố định đang dùng trong app.

Cách dùng:
    python ml/train_classifier.py --data ml/data
    # kết quả: ml/results/posture_eval.md  và  src/model/posture_lr.json

Nguyên tắc trung thực (xem Master Prompt, quy tắc 5):
  * Chia train/test THEO NGƯỜI, không theo khung hình.
  * Luôn báo kèm baseline ngưỡng cố định, kể cả khi hai bên ngang nhau.
  * Báo trung bình ± độ lệch giữa các người, theo từng góc máy/ánh sáng, và các trường hợp thất bại.
  * Không xuất mô hình vào app nếu dữ liệu là SYNTHETIC hoặc có ít hơn --min-subjects người.
"""
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.preprocessing import StandardScaler

from common import ROOT, SYNTH_BANNER, load_csvs, read_ts_const

FEATURES = ["elbow_angle_deg", "shoulder_wrist_offset_norm"]
CLASSES = ["BENT_ELBOW", "CORRECT_POSTURE", "OFF_AXIS"]


def threshold_predict(df: pd.DataFrame, elbow_min: float, offset_max: float) -> np.ndarray:
    """Bản Python của classifyByThreshold() trong src/lib/posture.ts."""
    out = np.full(len(df), "CORRECT_POSTURE", dtype=object)
    out[df["shoulder_wrist_offset_norm"].to_numpy() > offset_max] = "OFF_AXIS"
    out[df["elbow_angle_deg"].to_numpy() < elbow_min] = "BENT_ELBOW"  # gập khuỷu được ưu tiên
    return out


def make_model() -> tuple[StandardScaler, LogisticRegression]:
    return StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced", C=1.0)


def metrics(y_true, y_pred) -> tuple[float, float]:
    labels = sorted(set(y_true))
    return (
        accuracy_score(y_true, y_pred),
        f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0),
    )


def md_table(rows: list[list[str]], header: list[str]) -> str:
    out = ["| " + " | ".join(header) + " |", "|" + "|".join("---" for _ in header) + "|"]
    out += ["| " + " | ".join(r) + " |" for r in rows]
    return "\n".join(out)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="ml/data", help="thư mục chứa các file CSV xuất từ app")
    ap.add_argument("--min-visibility", type=float, default=0.5)
    ap.add_argument("--include-idle", action="store_true", help="giữ cả khung hình không ép (mặc định chỉ lấy is_compressing=1)")
    ap.add_argument("--min-subjects", type=int, default=6, help="số người tối thiểu để được xuất mô hình vào app")
    ap.add_argument("--model-out", default=str(ROOT / "src" / "model" / "posture_lr.json"))
    ap.add_argument("--report-out", default=str(ROOT / "ml" / "results" / "posture_eval.md"))
    args = ap.parse_args()

    df, synthetic = load_csvs(args.data)
    if synthetic:
        print(SYNTH_BANNER)

    n_all = len(df)
    df = df[df["arm_visibility"] >= args.min_visibility]
    if not args.include_idle:
        df = df[df["is_compressing"] == 1]
    df = df[df["label"].isin(CLASSES)].dropna(subset=FEATURES)
    subjects = sorted(df["subject_id"].unique())
    print(f"Khung hình dùng: {len(df)}/{n_all}; số người: {len(subjects)}")
    if len(subjects) < 3:
        raise SystemExit("Cần ít nhất 3 người để làm leave-one-person-out. Hãy thu thêm dữ liệu.")

    elbow_min = read_ts_const("ELBOW_MIN_DEG")
    offset_max = read_ts_const("SHOULDER_OFFSET_MAX")

    # ------------------------------------------------------------------ LOPO
    df = df.reset_index(drop=True)
    pred_lr = np.empty(len(df), dtype=object)
    pred_th = threshold_predict(df, elbow_min, offset_max)
    per_subject = []
    for s in subjects:
        te = (df["subject_id"] == s).to_numpy()
        tr = ~te
        if df.loc[tr, "label"].nunique() < 2:
            pred_lr[te] = df.loc[tr, "label"].iloc[0]
            continue
        sc, clf = make_model()
        clf.fit(sc.fit_transform(df.loc[tr, FEATURES]), df.loc[tr, "label"])
        pred_lr[te] = clf.predict(sc.transform(df.loc[te, FEATURES]))
        acc_lr, f1_lr = metrics(df.loc[te, "label"], pred_lr[te])
        acc_th, f1_th = metrics(df.loc[te, "label"], pred_th[te])
        per_subject.append((s, int(te.sum()), acc_lr, f1_lr, acc_th, f1_th))

    ps = pd.DataFrame(per_subject, columns=["subject", "n", "acc_lr", "f1_lr", "acc_th", "f1_th"])
    y = df["label"].to_numpy()

    def fmt(a: pd.Series) -> str:
        return f"{a.mean()*100:.1f} ± {a.std(ddof=1)*100:.1f}" if len(a) > 1 else f"{a.mean()*100:.1f}"

    summary_rows = [
        ["Ngưỡng cố định (%.0f°, %.2f)" % (elbow_min, offset_max), fmt(ps["acc_th"]), fmt(ps["f1_th"])],
        ["Hồi quy logistic (LOPO)", fmt(ps["acc_lr"]), fmt(ps["f1_lr"])],
    ]

    # ------------------------------------------------------------------ chia nhỏ theo điều kiện
    breakdown = []
    for col in ["camera_angle", "lighting", "device"]:
        for val, g in df.groupby(col):
            idx = g.index.to_numpy()
            if len(idx) < 30:
                continue
            a_lr, f_lr = metrics(y[idx], pred_lr[idx])
            a_th, f_th = metrics(y[idx], pred_th[idx])
            breakdown.append([col, str(val), str(g["subject_id"].nunique()), str(len(idx)),
                              f"{a_th*100:.1f}", f"{a_lr*100:.1f}", f"{f_lr*100:.1f}"])

    cm_lr = confusion_matrix(y, pred_lr.astype(str), labels=CLASSES)
    cm_th = confusion_matrix(y, pred_th.astype(str), labels=CLASSES)

    worst = ps.sort_values("acc_lr").head(3)

    # ------------------------------------------------------------------ báo cáo
    lines = []
    if synthetic:
        lines += [f"> **{SYNTH_BANNER}**", ""]
    lines += [
        "# Đánh giá bộ phân loại tư thế (leave-one-person-out)",
        "",
        f"- Ngày chạy: {date.today().isoformat()}",
        f"- Số người: **{len(subjects)}**; số khung hình dùng: **{len(df)}** "
        f"(lọc: độ hiển thị ≥ {args.min_visibility}" + ("" if args.include_idle else ", chỉ khi đang ép") + ")",
        f"- Đặc trưng: {', '.join(FEATURES)}",
        "- Chia train/test **theo người** (mỗi lần giữ 1 người làm tập kiểm tra).",
        "",
        "## Kết quả tổng hợp (trung bình ± độ lệch chuẩn giữa các người, %)",
        "",
        md_table(summary_rows, ["Phương pháp", "Accuracy", "Macro-F1"]),
        "",
        "Nếu hai dòng ngang nhau, hãy báo đúng như vậy: ngưỡng đơn giản đã đủ tốt với dữ liệu này.",
        "",
        "## Theo điều kiện thu (gộp khung hình; accuracy %)",
        "",
        md_table(breakdown, ["Điều kiện", "Giá trị", "Số người", "Khung hình", "Ngưỡng", "Logistic", "F1 logistic"]) if breakdown else "(không đủ dữ liệu)",
        "",
        "## Ma trận nhầm lẫn (hàng = thật, cột = dự đoán)",
        "",
        "Lớp: " + ", ".join(CLASSES),
        "",
        "Hồi quy logistic (LOPO):",
        "```",
        str(cm_lr),
        "```",
        "Ngưỡng cố định:",
        "```",
        str(cm_th),
        "```",
        "",
        "## Người khó nhất cho mô hình (ghi lại trường hợp thất bại)",
        "",
        md_table([[r.subject, str(r.n), f"{r.acc_lr*100:.1f}", f"{r.acc_th*100:.1f}"] for r in worst.itertuples()],
                 ["Người", "Khung hình", "Accuracy logistic", "Accuracy ngưỡng"]),
        "",
        "## Lưu ý khi diễn giải",
        "",
        "- Nhãn do người quay tự khai báo khi làm động tác; chưa có chuyên gia y tế kiểm duyệt nhãn.",
        "- Số người nhỏ và đa số là học sinh cùng trường: không khái quát hoá ra mọi người.",
        "- Chỉ ước lượng được trong điều kiện camera đặt nghiêng, đủ sáng; xem bảng theo điều kiện ở trên.",
    ]
    report = Path(args.report_out)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"\nĐã ghi báo cáo: {report}")

    # ------------------------------------------------------------------ xuất mô hình cuối (huấn luyện trên tất cả)
    if synthetic:
        print("Dữ liệu SYNTHETIC: KHÔNG xuất mô hình vào src/model/.")
        return
    if len(subjects) < args.min_subjects:
        print(f"Chỉ có {len(subjects)} người (< {args.min_subjects}): KHÔNG xuất mô hình vào app. "
              "Báo cáo là 'ngưỡng được hiệu chỉnh từ dữ liệu' thay vì 'mô hình huấn luyện'.")
        return

    sc, clf = make_model()
    clf.fit(sc.fit_transform(df[FEATURES]), df["label"])
    coef, intercept = clf.coef_, clf.intercept_
    classes = [str(c) for c in clf.classes_]
    if len(classes) == 2:  # nhị phân: đổi sang dạng softmax 2 hàng cho khớp code TypeScript
        coef = np.vstack([-coef[0] / 2, coef[0] / 2])
        intercept = np.array([-intercept[0] / 2, intercept[0] / 2])
    model = {
        "classes": classes,
        "features": FEATURES,
        "mean": sc.mean_.tolist(),
        "scale": sc.scale_.tolist(),
        "coef": coef.tolist(),
        "intercept": intercept.tolist(),
        "meta": {
            "trained_on": date.today().isoformat(),
            "n_subjects": len(subjects),
            "n_frames": int(len(df)),
            "lopo_accuracy_mean": round(float(ps["acc_lr"].mean()), 4),
            "baseline_threshold_accuracy_mean": round(float(ps["acc_th"].mean()), 4),
        },
    }
    out = Path(args.model_out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(model, indent=2), encoding="utf-8")
    print(f"Đã xuất mô hình: {out}  (app sẽ tự dùng file này khi build lại)")


if __name__ == "__main__":
    main()
