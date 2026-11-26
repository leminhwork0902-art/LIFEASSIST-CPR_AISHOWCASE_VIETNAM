# Quy trình thu dữ liệu (24–25/11)

Mục tiêu: có dữ liệu thật để (1) huấn luyện/hiệu chỉnh bộ phân loại tư thế, (2) đo sai số đếm nhịp.
Không có bước này thì phần "đội tự làm AI" và Technical Skills không có bằng chứng.

## Cần bao nhiêu

| Mục | Tối thiểu | Tốt hơn |
|---|---|---|
| Số người | **6** (dưới 6: không xuất mô hình, chỉ báo "ngưỡng hiệu chỉnh từ dữ liệu") | 8–10 |
| Mỗi người | 3 nhãn (ĐÚNG / gập khuỷu / lệch trục) × 2 góc máy × ~30 giây | thêm 2 mức ánh sáng |
| Thiết bị | 2 loại điện thoại/laptop khác nhau trong cả đợt | 3 loại, có 1 máy cấu hình thấp |

## Trước khi thu

1. **Phiếu đồng ý của phụ huynh** cho mọi bạn dưới 18 tuổi (xem mẫu cuối trang). Không có phiếu = không thu.
2. Gán **mã ẩn danh** (S01, S02, …). Bảng đối chiếu mã ↔ tên chỉ giữ trong một file của giáo viên/nhóm trưởng, không nộp, không đưa lên GitHub.
3. Dùng **bản build mới** (có cột `session_id … gt_tap`). CSV xuất từ bản cũ không dùng được.
4. Mở app qua https (hoặc localhost trên laptop), mở mục **"Thu dữ liệu"** trong chế độ Luyện tập.

## Bố trí

- Người tập ép trên **gối/manikin đặt trên sàn hoặc bàn thấp**, mặc đồ ôm (áo rộng làm sai số tăng).
- Camera **đặt ngang hông, nhìn nghiêng 90°, cách ~1,5 m**. Thấy rõ vai, khuỷu tay, cổ tay và hông cùng một bên.
- Bật **"Hiện hình camera"** để căn khung, rồi tắt nếu muốn (không ảnh hưởng dữ liệu; **không lưu hình**).
- **Hai người**: một người ép, một người cầm máy thứ hai (hoặc ngồi cạnh màn hình) để **bấm phím Cách theo từng nhịp ép**.

## Một lượt ghi

1. Nhập mã người tập, tên thiết bị; chọn nhãn, góc máy, ánh sáng **đúng với điều đang làm**.
2. Bấm **Bắt đầu ghi**. Người ép ép liên tục ~30 giây theo kiểu của nhãn đó:
   - *Tư thế ĐÚNG*: tay thẳng, vai ngay trên cổ tay.
   - *Gập khuỷu tay*: cố ý gập khuỷu rõ rệt.
   - *Lệch trục vai–tay*: đẩy vai ra trước/sau cổ tay nhưng giữ tay thẳng.
3. Người thứ hai bấm **phím Cách** (hoặc nút tím trên màn hình) mỗi lần thấy một nhịp ép.
4. Bấm **Dừng ghi** → **Tải CSV**. Đặt tên thư mục theo người: `ml/data/S01/…`.
5. Đổi nhãn/góc máy rồi lặp lại. Nên **đổi nhãn giữa các lượt, không đổi giữa chừng** một lượt.

Mỗi vài phiên, hãy **quay một clip ngắn chỉ để đếm tay** (khung hình không lộ mặt, xoá sau khi đếm) và so với số lần bấm
để biết người bấm có bỏ sót/bấm thừa không. Ghi lại số phiên đã kiểm.

## Sau khi thu

```bash
pip install -r ml/requirements.txt
python ml/eval_bpm.py --data ml/data          # sai số BPM so với nhịp thật  → ml/results/bpm_eval.md
python ml/train_classifier.py --data ml/data  # LOPO + baseline ngưỡng        → ml/results/posture_eval.md, src/model/posture_lr.json
```

Sau đó build lại app: nếu có `src/model/posture_lr.json`, giao diện tự đổi dòng "Phân loại: ngưỡng cố định" thành
"Phân loại: mô hình do đội huấn luyện".

Kiểm `ml/data/` đã nằm trong `.gitignore` trước khi `git push`.

## Điều không được làm

- Chia train/test theo khung hình (rò rỉ dữ liệu; script đã chia theo người).
- Dùng tiếng bíp metronome làm chuẩn nhịp.
- Bỏ các phiên "xấu" khỏi báo cáo. Phiên sai nhiều nhất phải được nêu trong phần giới hạn.
- Đưa số từ `ml/make_synthetic_demo.py` (dữ liệu giả) vào hồ sơ.

## Mẫu phiếu đồng ý (đội chỉnh lại theo trường và nhờ giáo viên duyệt)

> **Phiếu đồng ý tham gia thu thập dữ liệu — Dự án LifeAssist CPR (WAICY 2026)**
>
> Nhóm học sinh [tên nhóm], [trường], đang làm một công cụ AI giúp luyện tập ép tim. Chúng tôi xin phép cho con/em
> của quý phụ huynh thực hiện vài lượt ép tim mô phỏng (trên gối hoặc manikin, mỗi lượt khoảng 30 giây) trước camera.
>
> - Ứng dụng chỉ ghi **toạ độ các khớp xương dạng số** và các chỉ số góc; **không ghi hình, không ghi âm, không lưu khuôn mặt**.
> - Dữ liệu được gắn **mã ẩn danh**, không ghi tên. Dữ liệu dùng cho nghiên cứu của dự án và có thể nêu dưới dạng thống kê tổng hợp.
> - Việc tham gia là **tự nguyện**; có thể dừng bất cứ lúc nào, và yêu cầu xoá dữ liệu của mình trước ngày [ngày].
> - Hoạt động không xâm lấn và không có tiếp xúc với người thật; hãy báo ngay nếu em thấy đau/mỏi tay.
>
> Họ tên học sinh: ……… Lớp: ……… Mã ẩn danh (do nhóm điền): ………
> Họ tên phụ huynh: ……… Chữ ký: ……… Ngày: ………
