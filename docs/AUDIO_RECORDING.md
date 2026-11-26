# Thu âm giọng nói nhắc (8 file)

App phát file `.mp3` đã thu sẵn thay vì giọng máy, vì giọng máy tiếng Việt không có sẵn trên nhiều thiết bị
và có thể cần mạng. Nếu thiếu file, app vẫn chạy bằng giọng máy **dự phòng** và hiện cảnh báo vàng —
nhưng bản nộp/bản quay demo phải dùng file thu sẵn.

## Danh sách

Đặt đúng tên và đúng thư mục (phân biệt chữ thường):

| File | Tiếng Việt (`public/audio/vi/`) | Tiếng Anh (`public/audio/en/`) |
|---|---|---|
| `faster.mp3` | "Ép nhanh hơn" | "Push faster" |
| `slower.mp3` | "Ép chậm lại" | "Slow down" |
| `straighten.mp3` | "Duỗi thẳng tay" | "Straighten your arms" |
| `shoulders.mp3` | "Đưa vai lên trên hai tay" | "Shoulders over your hands" |

## Cách thu

1. Thu bằng điện thoại ở nơi yên tĩnh, đọc dứt khoát, **mỗi câu dài khoảng 1–1,5 giây** (người đang ép tim cần nghe nhanh).
2. Mỗi câu một file, không có khoảng lặng dài ở đầu/cuối.
3. Chuyển sang mp3 đơn kênh, cắt khoảng lặng, chuẩn hoá âm lượng (cần ffmpeg):

```bash
ffmpeg -i ban_thu.m4a -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5" -ac 1 -ar 44100 -b:a 96k faster.mp3
```

4. Chạy `npm run check:assets` để kiểm tra đủ file.
5. Tiếng Anh: nên để một bạn có phát âm tốt thu; hoặc dùng phụ đề tiếng Anh cho video và chỉ giữ tiếng Việt nếu không kịp
   (giao diện vẫn có thể bật EN).

## Metronome 110 BPM

**Không cần file.** Tiếng "tick" được sinh bằng WebAudio trong `src/lib/audio.ts`, đúng nhịp và chạy offline.
