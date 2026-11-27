/**
 * Bộ phân loại tư thế do đội huấn luyện (hồi quy logistic đa lớp), nạp từ
 * src/model/posture_lr.json do ml/train_classifier.py xuất ra.
 *
 * Nếu file JSON chưa tồn tại (chưa có dữ liệu/chưa huấn luyện), `getPostureModel()`
 * trả về null và ứng dụng dùng ngưỡng cố định — giao diện hiển thị rõ nguồn nào
 * đang được dùng, để không ai nói "AI do đội huấn luyện" khi thực ra chưa có.
 */
import type { PostureLabel } from './posture.ts';

export interface LrModel {
  classes: PostureLabel[];
  features: string[]; // ['elbow_angle_deg', 'shoulder_wrist_offset_norm']
  mean: number[];
  scale: number[];
  coef: number[][]; // [lớp][đặc trưng]
  intercept: number[];
  meta?: Record<string, unknown>;
}

const found = import.meta.glob('../model/posture_lr.json', { eager: true, import: 'default' });
const first = Object.values(found)[0] as LrModel | undefined;
const MODEL: LrModel | null = first && Array.isArray(first.classes) ? first : null;

export function getPostureModel(): LrModel | null {
  return MODEL;
}

export function predictPosture(m: LrModel, elbowAngleDeg: number, offsetNorm: number): { label: PostureLabel; prob: number } {
  const x = [elbowAngleDeg, offsetNorm];
  const z = x.map((v, i) => (v - m.mean[i]) / (m.scale[i] || 1));
  const logits = m.coef.map((w, k) => w.reduce((s, wi, i) => s + wi * z[i], m.intercept[k]));
  const mx = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - mx));
  const sum = exps.reduce((a, b) => a + b, 0);
  let best = 0;
  for (let k = 1; k < exps.length; k++) if (exps[k] > exps[best]) best = k;
  return { label: m.classes[best], prob: exps[best] / sum };
}
