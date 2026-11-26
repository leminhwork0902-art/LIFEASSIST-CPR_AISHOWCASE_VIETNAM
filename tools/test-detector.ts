// Kiểm thử bộ đếm nhịp bằng TÍN HIỆU GIẢ LẬP.
// Chạy:  node --experimental-strip-types tools/test-detector.ts
// LƯU Ý: đây là kiểm tra thuật toán trên dữ liệu tổng hợp, KHÔNG phải số liệu thực nghiệm.
// Không được đưa kết quả này vào hồ sơ như độ chính xác của hệ thống.
import { CprDetector } from '../src/lib/cprDetector.ts';

// PRNG có seed để kết quả lặp lại được
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number) {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

interface Case { name: string; bpm: number; fps: number; amp: number; noise: number; seconds: number; fpsJitter?: number }

function run(c: Case, seed: number) {
  const rnd = mulberry32(seed);
  const det = new CprDetector();
  const f = c.bpm / 60; // Hz
  let t = 1000;
  const end = t + c.seconds * 1000;
  let peaks = 0;
  let lastBpm: number | null = null;
  const bpms: number[] = [];
  const dt0 = 1000 / c.fps;
  while (t < end) {
    // wrist y: ép xuống = y tăng
    const phase = 2 * Math.PI * f * ((t - 1000) / 1000);
    const y = 0.5 + (c.amp / 2) * (1 - Math.cos(phase)) + gauss(rnd) * c.noise;
    const o = det.update(y, t);
    if (o.peak) peaks += 1;
    if (o.bpm !== null && t - 1000 > 8000) bpms.push(o.bpm); // bỏ 8 s đầu (khởi động cửa sổ)
    lastBpm = o.bpm;
    t += dt0 + (c.fpsJitter ? gauss(rnd) * c.fpsJitter : 0) * dt0;
    if (c.fpsJitter) t = Math.max(t, t); // giữ tăng đơn điệu
  }
  const expected = (c.seconds * c.bpm) / 60;
  const meanBpm = bpms.length ? bpms.reduce((a, b) => a + b, 0) / bpms.length : NaN;
  return { peaks, expected, meanBpm, lastBpm };
}

const cases: Case[] = [];
for (const fps of [15, 30, 60]) {
  for (const bpm of [90, 100, 110, 120, 140]) {
    cases.push({ name: `fps${fps} bpm${bpm} amp0.10 noise0.008`, bpm, fps, amp: 0.1, noise: 0.008, seconds: 30 });
  }
}
cases.push({ name: 'ép nông amp0.06 noise0.008 @30fps 110', bpm: 110, fps: 30, amp: 0.06, noise: 0.008, seconds: 30 });
cases.push({ name: 'nhiễu lớn noise0.015 amp0.10 @30fps 110', bpm: 110, fps: 30, amp: 0.1, noise: 0.015, seconds: 30 });
cases.push({ name: 'FPS rung 25% @30fps 110', bpm: 110, fps: 30, amp: 0.1, noise: 0.008, seconds: 30, fpsJitter: 0.25 });

let worst = 0;
console.log('case'.padEnd(46), 'đếm/kỳ vọng'.padEnd(14), 'BPM TB', ' sai số BPM');
for (const c of cases) {
  const r = run(c, 12345 + c.fps + c.bpm);
  const err = r.meanBpm - c.bpm;
  worst = Math.max(worst, Math.abs(err) || 0);
  console.log(
    c.name.padEnd(46),
    `${r.peaks}/${r.expected.toFixed(0)}`.padEnd(14),
    r.meanBpm.toFixed(1).padStart(6),
    (err >= 0 ? '+' : '') + err.toFixed(1),
  );
}
console.log('\nSai số BPM lớn nhất trên tín hiệu giả lập:', worst.toFixed(1));

// --- Kịch bản đặc biệt ---
{
  // 1) Dừng giữa chừng: ép 10 s, nghỉ 5 s (tay đứng yên), ép tiếp 10 s
  const det = new CprDetector();
  let t = 0; const fps = 30; const dt = 1000 / fps; const rnd = mulberry32(7);
  let compressingDuringRest = 0, restFrames = 0, peaksTotal = 0;
  while (t < 25000) {
    const pressing = t < 10000 || t >= 15000;
    const y = pressing
      ? 0.5 + 0.05 * (1 - Math.cos(2 * Math.PI * (110 / 60) * (t / 1000))) + gauss(rnd) * 0.008
      : 0.5 + gauss(rnd) * 0.008;
    const o = det.update(y, t);
    if (o.peak) peaksTotal++;
    if (t >= 12500 && t < 15000) { restFrames++; if (o.compressing) compressingDuringRest++; }
    t += dt;
  }
  console.log(`\n[nghỉ giữa chừng] tổng đỉnh=${peaksTotal} (kỳ vọng ≈ ${(20 * 110 / 60).toFixed(0)}); khung hình bị báo "đang ép" trong 2.5 s cuối của quãng nghỉ: ${compressingDuringRest}/${restFrames}`);
}
{
  // 2) Tay đứng yên + nhiễu cảm biến: không được đếm ra nhịp
  const det = new CprDetector();
  let peaks = 0; const rnd = mulberry32(99);
  for (let t = 0; t < 20000; t += 33) {
    const o = det.update(0.5 + gauss(rnd) * 0.01, t);
    if (o.peak) peaks++;
  }
  console.log(`[đứng yên + nhiễu 0.01] đỉnh đếm nhầm = ${peaks} (kỳ vọng 0)`);
}
{
  // 3) Mất dấu tay rồi tọa độ nhảy: notifyLost không để đếm nhầm
  const det = new CprDetector();
  let peaks = 0;
  for (let t = 0; t < 3000; t += 33) {
    const o = det.update(0.5 + 0.05 * (1 - Math.cos(2 * Math.PI * 1.8 * (t / 1000))), t);
    if (o.peak) peaks++;
  }
  const before = peaks;
  det.notifyLost();
  // sau khi mất dấu, tay "nhảy" một lần rồi đứng yên (không phải một lần ép)
  for (let t = 3000; t < 6000; t += 33) {
    const o = det.update(t < 3100 ? 0.9 : 0.5, t);
    if (o.peak) peaks++;
  }
  console.log(`[mất dấu rồi nhảy tọa độ] đỉnh trước=${before}, đỉnh đếm thêm sau mất dấu=${peaks - before} (kỳ vọng 0)`);
}
