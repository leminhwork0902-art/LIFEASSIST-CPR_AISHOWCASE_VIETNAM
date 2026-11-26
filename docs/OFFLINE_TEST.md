# Bài thử "chạy offline"

Chỉ được viết "chạy offline" vào hồ sơ **sau khi** đạt đủ các bước dưới đây trên **điện thoại thật**
(và ghi lại tên máy, trình duyệt, ngày thử).

1. `npm run build && npm run preview`, hoặc dùng bản đã triển khai qua **https**.
2. Mở trang trên điện thoại khi **có mạng**, đợi hiện "Sẵn sàng" và camera chạy. Bấm thử một phiên để chắc chắn
   giọng nói và metronome hoạt động. Đợi thêm ~30 giây để service worker cache xong (model + 2 file wasm khoảng 35 MB).
3. Bật **chế độ máy bay** (tắt cả Wi-Fi).
4. **Đóng hẳn** trình duyệt (vuốt tắt ứng dụng), rồi mở lại đúng địa chỉ đó.
5. Kiểm tra: trang mở được; mô hình nạp xong; camera chạy; bắt đầu một phiên 30 giây; có giọng nói nhắc; chế độ Khẩn cấp có metronome.

Ghi kết quả theo mẫu:

| Máy | Trình duyệt/phiên bản | Ngày | Mở lại được? | Nạp model? | Có giọng nói? | Ghi chú |
|---|---|---|---|---|---|---|
| | | | | | | |

Nếu có một bước hỏng, **không** ghi "chạy offline". Kiểm tra tab Application → Service Workers → Cache Storage
trong DevTools để xem file nào chưa được cache.

## Về hai file wasm

`public/mediapipe/wasm/` có hai bản (~14,6 MB mỗi bản) và cả hai đều bị cache. Có thể bỏ một bản để nhẹ hơn, nhưng
**chỉ sau khi** mở tab Network (có SIMD / không SIMD / trình duyệt khác nhau) và xác nhận MediaPipe thật sự nạp bản nào.
Nếu không chắc, giữ cả hai.
