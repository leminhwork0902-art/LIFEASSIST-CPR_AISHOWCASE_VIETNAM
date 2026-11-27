// Kiểm thử đơn vị cho chấm điểm phiên, chọn tay, phân loại ngưỡng, CSV.
// Chạy: node --experimental-strip-types tools/test-lib.ts
import { SessionScorer } from '../src/lib/sessionScorer.ts';
import { chooseSide, classifyByThreshold, calculateAngleDeg } from '../src/lib/posture.ts';
import { CSV_HEADERS, CsvRecorder } from '../src/lib/csvRecorder.ts';

let fails = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

// ---- Góc ----
check('góc thẳng 180°', Math.abs(calculateAngleDeg({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, 1) - 180) < 1e-6);
check('góc vuông 90°', Math.abs(calculateAngleDeg({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, 1) - 90) < 1e-6);
check('bù tỉ lệ khung hình (aspect 2 làm đổi góc)', Math.abs(calculateAngleDeg({ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0 }, 2) - 180 * 0 - 90) > 1);

// ---- Ngưỡng ----
check('165°, lệch 0.1 → đúng', classifyByThreshold(165, 0.1) === 'CORRECT_POSTURE');
check('140°, lệch 0.1 → gập khuỷu', classifyByThreshold(140, 0.1) === 'BENT_ELBOW');
check('170°, lệch 0.5 → lệch trục', classifyByThreshold(170, 0.5) === 'OFF_AXIS');
check('140° và lệch 0.5 → ưu tiên gập khuỷu', classifyByThreshold(140, 0.5) === 'BENT_ELBOW');

// ---- Chọn tay có độ trễ ----
const mk = (lv: number, rv: number) => {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  for (const i of [11, 13, 15]) lm[i].visibility = lv;
  for (const i of [12, 14, 16]) lm[i].visibility = rv;
  return lm;
};
check('lần đầu chọn tay hiển thị rõ hơn', chooseSide(mk(0.9, 0.5), null) === 'LEFT');
check('không đổi tay khi chênh lệch nhỏ (0.05)', chooseSide(mk(0.80, 0.85), 'LEFT') === 'LEFT');
check('đổi tay khi tay kia rõ hơn hẳn (0.3)', chooseSide(mk(0.4, 0.8), 'LEFT') === 'RIGHT');

// ---- Chấm điểm ----
{
  const s = new SessionScorer();
  // 3 s đầu chưa ép (compressing=false) với tư thế sai → KHÔNG được tính vào điểm
  for (let i = 0; i < 100; i++) s.addFrame({ dtMs: 30, compressing: false, bpm: null, posture: 'BENT_ELBOW' });
  // 20 s ép: 110 BPM, tư thế đúng
  for (let i = 0; i < 666; i++) s.addFrame({ dtMs: 30, compressing: true, bpm: 110, posture: 'CORRECT_POSTURE' });
  for (let i = 0; i < 55; i++) s.addPeak();
  const r = s.summarize(30);
  check('chấm điểm: đủ dữ liệu', r.enoughData);
  check('chấm điểm: nhịp trung bình 110', r.avgBpm === 110, `avg=${r.avgBpm}`);
  check('chấm điểm: 100% thời gian đạt nhịp', r.bpmInTargetPct === 100, `${r.bpmInTargetPct}`);
  check('chấm điểm: 100% tư thế tốt (3 s đầu không bị tính)', r.goodPosturePct === 100, `${r.goodPosturePct}`);
  check('chấm điểm: ép ≈ 67% thời lượng', r.compressingPct >= 65 && r.compressingPct <= 69, `${r.compressingPct}`);
  check('chấm điểm: không có lỗi chính', r.mainIssue === 'NONE');
}
{
  const s = new SessionScorer();
  // 12 s ép quá chậm (90), 8 s ép đúng; tư thế gập khuỷu 50% thời gian
  for (let i = 0; i < 400; i++) s.addFrame({ dtMs: 30, compressing: true, bpm: 90, posture: i % 2 ? 'BENT_ELBOW' : 'CORRECT_POSTURE' });
  for (let i = 0; i < 266; i++) s.addFrame({ dtMs: 30, compressing: true, bpm: 110, posture: 'CORRECT_POSTURE' });
  const r = s.summarize(30);
  check('lỗi chính = ép quá chậm', r.mainIssue === 'TOO_SLOW', r.mainIssue);
  check('% đạt nhịp ≈ 40%', r.bpmInTargetPct !== null && Math.abs(r.bpmInTargetPct - 40) <= 2, `${r.bpmInTargetPct}`);
}
{
  const s = new SessionScorer();
  for (let i = 0; i < 50; i++) s.addFrame({ dtMs: 30, compressing: true, bpm: 110, posture: 'CORRECT_POSTURE' }); // 1.5 s
  const r = s.summarize(30);
  check('ép < 5 s → không đủ dữ liệu, không in phần trăm', !r.enoughData && r.avgBpm === null && r.goodPosturePct === null);
}
{
  // không phụ thuộc FPS: cùng 20 s ép ở 15 FPS và 60 FPS phải cho cùng kết quả
  const run = (fps: number) => {
    const s = new SessionScorer();
    const dt = 1000 / fps;
    for (let i = 0; i < 20 * fps; i++) s.addFrame({ dtMs: dt, compressing: true, bpm: i % 4 === 0 ? 95 : 110, posture: 'CORRECT_POSTURE' });
    return s.summarize(30);
  };
  const a = run(15), b = run(60);
  check('kết quả không đổi theo FPS (15 vs 60)', a.bpmInTargetPct === b.bpmInTargetPct && a.compressingPct === b.compressingPct, `${a.bpmInTargetPct}/${b.bpmInTargetPct}`);
}

// ---- CSV ----
check('CSV có 16 cột', CSV_HEADERS.length === 16, CSV_HEADERS.join(','));

{
  const rec = new CsvRecorder();
  rec.start(1000);
  const meta = { subjectId: 'S,01', label: 'BENT_ELBOW' as const, cameraAngle: 'SIDE_90' as const, lighting: 'DIM' as const, device: 'Pixel "6a"' };
  const base = { elbowAngleDeg: 150, offsetNorm: 0.2, wristYNorm: 0.5, wristYSmooth: 0.5, armVisibility: 0.9, fps: 30, isCompressing: true, detectedPeak: false };
  rec.push(1033, meta, base);
  rec.tap();
  rec.push(1066, meta, { ...base, detectedPeak: true });
  rec.push(1099, meta, base);
  const lines = rec.toCsv().split('\n');
  const cols = (l: string) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.length - 1;
  check('CSV: 1 header + 3 dòng', lines.length === 4 && rec.count === 3);
  check('CSV: dấu phẩy/nháy trong ô được escape (số cột không đổi)', cols(lines[1]) === CSV_HEADERS.length, `${cols(lines[1])}`);
  check('CSV: gt_tap chỉ gắn vào khung hình ngay sau khi bấm', lines[1].endsWith(',0') && lines[2].endsWith(',1') && lines[3].endsWith(',0'));
  check('CSV: detected_peak đúng khung', lines[2].split(',').slice(-2)[0] === '1');
  check('CSV: thời gian tương đối từ lúc bắt đầu ghi', lines[1].includes(',33.0,'));
}

console.log(fails === 0 ? '\nTất cả đều qua.' : `\n${fails} kiểm tra thất bại.`);
process.exit(fails === 0 ? 0 : 1);
