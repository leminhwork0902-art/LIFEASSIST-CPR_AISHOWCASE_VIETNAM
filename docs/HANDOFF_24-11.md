# Bàn giao 24/11 — LifeAssist CPR

Làm tiếp từ bản đánh giá 23/11. Mốc: khóa bản **27/11**, nộp tối **28/11** (hạn thật 5:00 sáng 30/11 giờ VN).

## 0. Cách áp dụng bản cập nhật

Gói này chỉ chứa file **mới/đã sửa** (không kèm `public/mediapipe/` nặng ~35 MB). Giải nén **đè lên thư mục dự án** (giữ nguyên `public/mediapipe/`).
Sau đó xoá các file mẫu không còn dùng: `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`, `public/icons.svg`.
`src/components/PoseTracker.tsx` bị thay hoàn toàn; `src/App.tsx`, `src/App.css`, `src/index.css`, `index.html`, `vite.config.ts`, `package.json` (chỉ thêm 2 script), `.gitignore`, `README.md` cũng bị ghi đè.

## 1. Đã làm trong đợt này

| # (theo bản đánh giá) | Việc | Cách làm |
|---|---|---|
| P0-1 | Âm thanh im lặng | Thêm `public/audio/{vi,en}/…`, nạp bằng WebAudio, **thiếu file thì dùng giọng máy dự phòng và hiện cảnh báo vàng** (không còn im lặng). **Chưa có file thu thật — xem mục 3.** |
| P0-2 | Khẩn cấp không có metronome | Metronome 110 BPM sinh bằng WebAudio (không cần file, chạy offline). Có cả ở chế độ Luyện tập (tùy chọn). Giọng nói ở Khẩn cấp **chưa làm** (nằm trong danh sách cắt trước) |
| P0-3 | Lỗi camera/GPU báo sai | Lỗi model, GPU→CPU fallback, từ chối camera, không có camera, trang không phải https được báo riêng; `await` + `try/catch` cho camera |
| P0-4 | Điểm tính cả lúc không ép | Chấm điểm theo **thời gian**, chỉ khi đang ép; không phụ thuộc FPS; có đếm ngược 3-2-1; không đủ dữ liệu (<5 s ép) thì **không in phần trăm** |
| P0-5 | Phản hồi bị ghi đè | Nhịp và tư thế là hai dòng riêng; giọng nói chọn lời nhắc "lâu chưa nghe nhất" nên sai tư thế vẫn nghe nhắc nhịp |
| 6 | Đếm nhịp theo ngưỡng cố định/khung hình | `cprDetector.ts`: làm mượt theo ms, tìm đỉnh có hysteresis, nhịp = (n−1)/thời gian trong cửa sổ 6 s |
| 7 | Không loại dữ liệu xấu | Bỏ khung hình có độ hiển thị < 0,5; mất dấu tay thì reset bộ tìm đỉnh |
| 9 | setState mỗi khung hình | Giao diện cập nhật ~8 lần/giây từ `liveRef`; vòng lặp bỏ qua khung hình video trùng |
| 10, 11 | Side-effect trong updater, cleanup, StrictMode | Đồng hồ phiên dựa trên mốc thời gian, không gọi hàm trong updater; đóng `poseLandmarker`, tắt camera, chống chạy hai lần |
| 13 | CSV thiếu cột | 16 cột: góc máy, ánh sáng, thiết bị, `is_compressing`, `detected_peak`, **`gt_tap`** (người thứ hai bấm phím Cách theo từng nhịp) |
| 14 | PWA thiếu icon | Icon 192/512/maskable + manifest. Chưa bỏ bản wasm nào (xem `OFFLINE_TEST.md`) |
| 16 | Trích dẫn y khoa mơ hồ | Gắn AHA 2025 Part 7 cụ thể + link; `SOURCES_AND_CLAIMS.md` |
| 17 | Chỉ tiếng Việt | Nút VI/EN, toàn bộ chuỗi giao diện có cả hai |
| — | Dọn dự án | `index.html` (title, theme), README thật, `.gitignore` chặn dữ liệu người tham gia |

**Lỗi tôi thấy thêm khi đọc code (ngoài bản đánh giá):**
- Khi hai tay có độ hiển thị gần nhau, code cũ đổi qua lại giữa cổ tay trái/phải theo từng khung hình → tọa độ nhảy và bị đếm thành nhịp ép giả. Đã thêm chọn tay có độ trễ.
- `canvas.width = …` gán mỗi khung hình (xóa và cấp lại canvas) và `new DrawingUtils` mỗi khung hình. Đã sửa.
- Đường dẫn `/mediapipe/...` và `/audio/...` viết cứng sẽ hỏng nếu triển khai ở thư mục con (ví dụ GitHub Pages `/ten-repo/`). Đã dùng `import.meta.env.BASE_URL`.
- `src/index.css` còn style mẫu Vite (`#root { width:1126px; border-inline; text-align:center }`). Đã thay.
- Camera chỉ chạy trên https/localhost: thử điện thoại qua `http://192.168.x.x` sẽ không mở được camera (giờ có thông báo riêng).

**Bộ công cụ cho P1 (làm sớm vì bản đánh giá nói dữ liệu đang chậm nhất):**
`ml/train_classifier.py` (logistic regression, leave-one-person-out, so với ngưỡng cố định, bảng theo góc máy/ánh sáng/thiết bị, ma trận nhầm lẫn, người khó nhất, xuất `src/model/posture_lr.json`) và `ml/eval_bpm.py` (sai số BPM so với `gt_tap`, gợi ý chỉnh `minProminence`).
Hai script **từ chối xuất mô hình vào app** nếu dữ liệu là SYNTHETIC hoặc có ít hơn 6 người.

## 2. Đã kiểm chứng gì, chưa kiểm chứng gì

**Đã chạy được trong môi trường của tôi (không có mạng, không cài được package):**
- `npm run test:detector`: bộ đếm nhịp trên tín hiệu **giả lập** (15/30/60 FPS, 90–140 BPM, có nhiễu, FPS rung, gợn đôi, trôi, rơi khung, nghỉ giữa chừng, mất dấu tay). Sai số lớn nhất 0,2 BPM trên tín hiệu lý tưởng; đứng yên + nhiễu → 0 nhịp đếm nhầm.
- `tools/test-lib.ts`: 26 kiểm tra đơn vị (góc, ngưỡng, chọn tay, chấm điểm, CSV). Tất cả qua.
- `tsc --strict` trên toàn bộ `src/` với khai báo giả cho React/MediaPipe: không còn lỗi thật (chỉ còn các lỗi `implicit any` do khai báo giả của tôi thiếu kiểu sự kiện React).
- Hai script Python chạy hết đường ống trên dữ liệu SYNTHETIC.

**CHƯA chạy/chưa kiểm chứng:**
- `npm ci`, `npm run build`, `npm run dev`, chạy trên trình duyệt thật, camera thật, MediaPipe thật. **Đây là việc đầu tiên đội phải làm (mục 4).**
- Các phiên bản trong `package.json` (typescript ~7.0.2, vite ^8.3.6, …) tôi giữ nguyên và không xác minh được. Nếu `npm ci` lỗi, gửi tôi nguyên văn lỗi.
- Giọng nói thu sẵn, offline, PWA trên điện thoại thật, FPS trên máy yếu.
- Ngưỡng `minProminence = 0.04`, góc 160°, độ lệch 0.28 **đều là con số đoán** chưa hiệu chỉnh từ dữ liệu. Thử nghiệm giả lập cho thấy biên độ chuyển động cổ tay < 0,04 thì bộ đếm không đếm được nhịp nào; ép nông trên gối có thể rơi vào trường hợp này.
- Rơi 30% khung hình ở 15 FPS làm mất ~7% nhịp (giả lập).

## 3. Cần đội làm / gửi lại

1. **Thu 8 file giọng nói** theo `docs/AUDIO_RECORDING.md`, đặt vào `public/audio/vi` và `en`. Tôi không có công cụ tạo giọng đọc.
2. Chạy `npm ci && npm run build && npm run check:assets && npm run dev`. Gửi tôi: kết quả, ảnh chụp màn hình, và **nguyên văn mọi lỗi** (terminal + Console của trình duyệt).
3. Thử trên 1 điện thoại thật qua https (Vercel/Netlify/GitHub Pages) và báo FPS hiển thị.
4. Thu dữ liệu theo `docs/DATA_COLLECTION.md` (≥ 6 người, có phiếu phụ huynh). Gửi tôi **các file CSV** (không có hình ảnh) hoặc đã chạy hai script và gửi `ml/results/*.md`.
5. Trả lời giúp tôi: **khối thi** (Elementary/Middle/High); **số thành viên + tất cả dưới 18 tuổi**; **số người/thiết bị thực tế đã thu**; app triển khai ở đâu (URL).
6. Tự đối chiếu các nguồn trong `docs/SOURCES_AND_CLAIMS.md` và rubric tại waicy.org/rubrics (tôi chưa đối chiếu rubric chính thức).

## 4. Bước tiếp theo (tôi làm ngay khi có thông tin)

- 25/11: sửa lỗi build/chạy (nếu có), hiệu chỉnh `minProminence`/ngưỡng theo `bpm_eval.md`, đưa mô hình vào app.
- 25–26/11: nháp **Description** và **AI Usage Explanation** (mỗi phần ≤ 250 từ, tiếng Anh) **từ số liệu thật**, kịch bản video 3 + 3 phút, 15 câu hỏi Q&A, slide.

## 5. Điều được và chưa được viết vào hồ sơ (tính đến hôm nay)

| Có thể viết | **Chưa** được viết |
|---|---|
| App xử lý trên thiết bị; không gửi, không lưu video (đúng với code hiện tại: chỉ lưu toạ độ khi người dùng chủ động ghi và tải CSV) | "Chạy offline" (chưa qua bài thử máy bay) |
| Thuật toán đếm nhịp, chấm điểm, đặc trưng góc/độ lệch do đội viết | "Độ chính xác X%", "sai số ±Y BPM" (chưa có số đo thật) |
| MediaPipe là mô hình có sẵn của Google, đội không huấn luyện | "Bộ phân loại do đội huấn luyện" (chưa có dữ liệu; hiện dùng ngưỡng đoán) |
| Không đo được độ sâu ép; công cụ luyện tập, không thay thế 115 | "Độ trễ < N ms", "30–60 FPS" (chưa đo trên máy nào) |
| Nhịp mục tiêu 100–120/phút theo AHA 2025 | "Giảm sai sót sơ cứu", "cứu sống" |
