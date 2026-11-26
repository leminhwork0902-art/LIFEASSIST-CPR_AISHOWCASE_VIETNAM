# LifeAssist CPR

Huấn luyện viên ép tim bằng AI cho học sinh và cộng đồng — chạy hoàn toàn trên trình duyệt,
không gửi và không lưu video. Dự án tham dự WAICY 2026 (AI Showcase).

> Công cụ hỗ trợ **luyện tập** nhịp ép và tư thế tay từ góc nhìn nghiêng 2D. Không đo được độ sâu ép
> (5–6 cm), không thay thế nhân viên y tế hay khoá học CPR có chứng chỉ.

## Chạy thử

```bash
npm ci
npm run check:assets   # kiểm tra file bắt buộc (model, icon, giọng nói)
npm run test:detector  # kiểm thử thuật toán đếm nhịp bằng tín hiệu giả lập
npm run dev            # http://localhost:5173
npm run build && npm run preview
```

Camera chỉ hoạt động trên **https://** hoặc **localhost**. Để thử trên điện thoại hãy mở bản đã triển khai (https),
không mở bằng `http://192.168.x.x`.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `src/lib/cprDetector.ts` | Thuật toán đếm nhịp (làm mượt theo ms + tìm đỉnh có hysteresis) — đội tự viết |
| `src/lib/posture.ts` | Góc khuỷu tay, độ lệch vai–cổ tay, chọn tay, baseline ngưỡng cố định |
| `src/lib/postureModel.ts` | Nạp bộ phân loại do đội huấn luyện (`src/model/posture_lr.json`) nếu có |
| `src/lib/sessionScorer.ts` | Chấm điểm phiên 30 giây theo thời gian |
| `src/lib/audio.ts` | Giọng nói thu sẵn + metronome WebAudio (offline) |
| `src/lib/csvRecorder.ts` | Xuất CSV tọa độ khớp (không có hình ảnh) |
| `ml/` | Script Python: huấn luyện + đánh giá leave-one-person-out, sai số BPM |
| `docs/` | Quy trình thu dữ liệu, thu âm, thử offline, nguồn y khoa |

## Trạng thái trung thực

Xem `docs/HANDOFF_24-11.md` — danh sách điều đã kiểm chứng, chưa kiểm chứng, và những điều **chưa được phép**
viết vào hồ sơ cho đến khi có số đo thật.

Mô hình MediaPipe Pose Landmarker là mô hình có sẵn của Google; đội không huấn luyện nó.
