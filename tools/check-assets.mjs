// Kiểm tra các file bắt buộc trong public/ trước khi build/quay demo.
// Chạy: npm run check:assets
import { existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const cues = ['faster', 'slower', 'straighten', 'shoulders'];
const required = [
  'mediapipe/pose_landmarker_lite.task',
  'mediapipe/wasm/vision_wasm_internal.wasm',
  'mediapipe/wasm/vision_wasm_internal.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  ...['vi', 'en'].flatMap((l) => cues.map((c) => `audio/${l}/${c}.mp3`)),
];

let missing = 0;
for (const f of required) {
  const p = join(root, f);
  if (existsSync(p) && statSync(p).size > 0) console.log(`  ok       ${f}`);
  else {
    console.log(`  THIẾU    ${f}`);
    missing++;
  }
}
console.log(missing === 0 ? '\nĐủ file.' : `\nThiếu ${missing} file. Giọng nói thiếu thì app chạy bằng giọng máy dự phòng và hiện cảnh báo.`);
process.exit(missing === 0 ? 0 : 1);
