import type { Lang } from './lib/audio.ts';

const vi = {
  appTitle: 'LifeAssist CPR',
  appSubtitle: 'Huấn luyện viên ép tim bằng AI — xử lý ngay trên thiết bị, không gửi hay lưu video',
  language: 'Ngôn ngữ',

  modePractice: 'Luyện tập',
  modeEmergency: 'Khẩn cấp (tối giản)',

  // trạng thái hệ thống
  loadingModel: 'Đang nạp mô hình AI từ bộ nhớ cục bộ…',
  errModel: 'Không nạp được mô hình MediaPipe từ public/mediapipe/. Kiểm tra lại thư mục public và chạy lại.',
  errCameraDenied: 'Chưa được cấp quyền camera. Hãy cho phép camera trong cài đặt trình duyệt rồi tải lại trang.',
  errCameraNotFound: 'Không tìm thấy camera trên thiết bị này.',
  errCameraInsecure: 'Camera chỉ hoạt động trên https:// hoặc localhost. Hãy mở trang qua địa chỉ https.',
  errCameraOther: 'Không mở được camera. Đóng các ứng dụng khác đang dùng camera rồi tải lại trang.',
  noteCpuFallback: 'GPU không khả dụng — đang chạy bằng CPU (có thể chậm hơn).',
  warnAudioMissing: 'Chưa có file giọng nói ghi sẵn — đang dùng giọng máy dự phòng.',
  warnLowFps: 'FPS thấp: kết quả đo nhịp có thể kém chính xác.',

  // điều khiển phiên
  startSession: 'Bắt đầu bài tập 30 giây',
  stopEarly: 'Dừng sớm',
  getReady: 'Chuẩn bị…',
  timeLeft: 'Còn lại',
  metronomeOn: 'Bật nhịp mẫu 110',
  metronomeOff: 'Tắt nhịp mẫu',

  // HUD
  hudRate: 'Tần số ép',
  hudBpmUnit: 'lần/phút',
  hudElbow: 'Góc khuỷu tay',
  hudOffset: 'Lệch vai–cổ tay',
  hudTarget: 'Mục tiêu',
  hudClassifierThreshold: 'Phân loại: ngưỡng cố định',
  hudClassifierModel: 'Phân loại: mô hình do đội huấn luyện',

  // phản hồi
  fbNoArm: 'Không thấy rõ tay — điều chỉnh camera để thấy vai, khuỷu tay và cổ tay',
  fbWaiting: 'Sẵn sàng. Bắt đầu ép để đo nhịp',
  fbMeasuring: 'Đang đo nhịp…',
  fbRateLow: 'Ép NHANH HƠN (mục tiêu 100–120 lần/phút)',
  fbRateHigh: 'Ép CHẬM LẠI (mục tiêu 100–120 lần/phút)',
  fbRateOk: 'Nhịp ép đạt chuẩn',
  fbBent: 'DUỖI THẲNG KHUỶU TAY',
  fbOffAxis: 'ĐƯA VAI LÊN THẲNG TRÊN CỔ TAY',
  fbPostureOk: 'Tư thế tay và vai tốt',
  lblRate: 'Nhịp',
  lblPosture: 'Tư thế',

  // giọng nói dự phòng (khi chưa có file thu sẵn)
  cueFaster: 'Ép nhanh hơn',
  cueSlower: 'Ép chậm lại',
  cueStraighten: 'Duỗi thẳng tay',
  cueShoulders: 'Đưa vai lên trên hai tay',

  // tổng kết
  sumTitle: 'Kết quả bài tập',
  sumCompressions: 'Tổng số lần ép',
  sumAvgBpm: 'Tần số trung bình',
  sumInTarget: 'Thời gian đạt 100–120/phút',
  sumPosture: 'Thời gian tư thế tốt',
  sumActive: 'Thời gian thực sự ép',
  sumNotEnough: 'Chưa đủ dữ liệu để chấm điểm: cần ép liên tục ít nhất 5 giây trong tầm nhìn của camera.',
  sumMainIssue: 'Lỗi chính',
  issueNONE: 'Không có lỗi nổi bật',
  issueTOO_SLOW: 'Ép quá chậm',
  issueTOO_FAST: 'Ép quá nhanh',
  issueBENT_ELBOW: 'Khuỷu tay chưa thẳng',
  issueOFF_AXIS: 'Vai chưa thẳng trên cổ tay',
  sumDisclaimer: 'Điểm chỉ phản ánh nhịp ép và tư thế tay đo bằng camera 2D, không phản ánh độ sâu ép.',

  // khẩn cấp
  emCall: 'GỌI CẤP CỨU 115 NGAY',
  emStepsTitle: 'Hướng dẫn CPR cho người lớn (chỉ ép tim)',
  emStep1: 'Gọi 115 hoặc nhờ người xung quanh gọi; nhờ người khác lấy máy AED nếu có.',
  emStep2: 'Đặt người bệnh nằm ngửa trên mặt phẳng, cứng.',
  emStep3: 'Đặt gót một bàn tay lên nửa dưới xương ức (giữa ngực), bàn tay kia chồng lên trên.',
  emStep4: 'Giữ thẳng tay, ép mạnh và nhanh 100–120 lần/phút, sâu khoảng 5–6 cm, để ngực nảy lên hết sau mỗi lần ép. Tiếp tục cho đến khi có nhân viên y tế hoặc máy AED.',
  emSource: 'Nguồn: Hiệp hội Tim mạch Hoa Kỳ (AHA), Hướng dẫn CPR & ECC 2025 — Phần 7: Hỗ trợ sự sống cơ bản ở người lớn.',
  emSourceNote: 'Đội chỉ tóm tắt lại; vui lòng đối chiếu với tài liệu gốc.',

  // thu dữ liệu
  recTitle: 'Thu dữ liệu (dành cho nhóm nghiên cứu)',
  recHelp: 'Chỉ lưu tọa độ khớp đã chuẩn hoá, không lưu hình ảnh hay video. Dùng mã ẩn danh, không dùng tên thật.',
  recSubject: 'Mã người tập (ẩn danh)',
  recLabel: 'Nhãn tư thế đang thực hiện',
  recLabelCorrect: 'Tư thế ĐÚNG',
  recLabelBent: 'Gập khuỷu tay',
  recLabelOff: 'Lệch trục vai–tay',
  recAngle: 'Góc đặt camera',
  recAngleSide: 'Ngang 90°',
  recAngleDiag: 'Chéo 45°',
  recAngleFront: 'Chính diện 0°',
  recLight: 'Ánh sáng',
  recLightBright: 'Sáng',
  recLightDim: 'Yếu',
  recDevice: 'Thiết bị (vd. Pixel 6a)',
  recStart: 'Bắt đầu ghi',
  recStop: 'Dừng ghi',
  recRows: 'dòng',
  showCamera: 'Hiện hình camera trên màn hình (không lưu)',
  recTap: 'BẤM THEO TỪNG NHỊP ÉP (phím Cách)',
  recTapHelp: 'Người thứ hai bấm mỗi lần thấy một nhịp ép — dùng làm chuẩn đối chiếu độc lập với AI.',
  recDownload: 'Tải CSV',
  recClear: 'Xoá',

  limits: 'Công cụ hỗ trợ luyện tập nhịp ép và tư thế tay từ góc nhìn nghiêng 2D. Không đo được độ sâu ép (5–6 cm), không thay thế nhân viên y tế hay khoá học CPR có chứng chỉ.',
};

export type StringKey = keyof typeof vi;

const en: Record<StringKey, string> = {
  appTitle: 'LifeAssist CPR',
  appSubtitle: 'AI chest-compression coach — runs on your device, no video is sent or stored',
  language: 'Language',

  modePractice: 'Practice',
  modeEmergency: 'Emergency (minimal)',

  loadingModel: 'Loading the AI model from local storage…',
  errModel: 'Could not load the MediaPipe model from public/mediapipe/. Check the public folder and reload.',
  errCameraDenied: 'Camera permission was denied. Allow camera access in your browser settings and reload.',
  errCameraNotFound: 'No camera was found on this device.',
  errCameraInsecure: 'The camera only works on https:// or localhost. Open the page over https.',
  errCameraOther: 'Could not open the camera. Close other apps that use the camera and reload.',
  noteCpuFallback: 'GPU unavailable — running on CPU (may be slower).',
  warnAudioMissing: 'Recorded voice files are missing — using the device voice as a fallback.',
  warnLowFps: 'Low FPS: rate measurements may be less accurate.',

  startSession: 'Start 30-second drill',
  stopEarly: 'Stop early',
  getReady: 'Get ready…',
  timeLeft: 'Time left',
  metronomeOn: 'Metronome 110 on',
  metronomeOff: 'Metronome off',

  hudRate: 'Compression rate',
  hudBpmUnit: 'per min',
  hudElbow: 'Elbow angle',
  hudOffset: 'Shoulder–wrist offset',
  hudTarget: 'Target',
  hudClassifierThreshold: 'Classifier: fixed thresholds',
  hudClassifierModel: 'Classifier: team-trained model',

  fbNoArm: 'Arm not clearly visible — adjust the camera to show shoulder, elbow and wrist',
  fbWaiting: 'Ready. Start compressing to measure your rate',
  fbMeasuring: 'Measuring rate…',
  fbRateLow: 'Push FASTER (target 100–120 per minute)',
  fbRateHigh: 'Push SLOWER (target 100–120 per minute)',
  fbRateOk: 'Compression rate on target',
  fbBent: 'STRAIGHTEN YOUR ELBOWS',
  fbOffAxis: 'BRING YOUR SHOULDERS OVER YOUR WRISTS',
  fbPostureOk: 'Arm and shoulder posture good',
  lblRate: 'Rate',
  lblPosture: 'Posture',

  cueFaster: 'Push faster',
  cueSlower: 'Slow down',
  cueStraighten: 'Straighten your arms',
  cueShoulders: 'Shoulders over your hands',

  sumTitle: 'Drill results',
  sumCompressions: 'Total compressions',
  sumAvgBpm: 'Average rate',
  sumInTarget: 'Time at 100–120 per min',
  sumPosture: 'Time with good posture',
  sumActive: 'Time actually compressing',
  sumNotEnough: 'Not enough data to score: compress continuously for at least 5 seconds in view of the camera.',
  sumMainIssue: 'Main issue',
  issueNONE: 'No major issue',
  issueTOO_SLOW: 'Compressing too slowly',
  issueTOO_FAST: 'Compressing too fast',
  issueBENT_ELBOW: 'Elbows not straight',
  issueOFF_AXIS: 'Shoulders not over wrists',
  sumDisclaimer: 'The score reflects compression rate and arm posture measured by a 2D camera. It does not reflect compression depth.',

  emCall: 'CALL 115 NOW',
  emStepsTitle: 'Adult CPR (compression-only)',
  emStep1: 'Call 115 or ask someone nearby to call; send someone to fetch an AED if available.',
  emStep2: 'Lay the person on their back on a firm, flat surface.',
  emStep3: 'Place the heel of one hand on the lower half of the breastbone (centre of the chest), the other hand on top.',
  emStep4: 'Keep your arms straight and push hard and fast at 100–120 per minute, about 5–6 cm deep, letting the chest rise fully after each push. Continue until medical help or an AED arrives.',
  emSource: 'Source: American Heart Association (AHA), 2025 Guidelines for CPR & ECC — Part 7: Adult Basic Life Support.',
  emSourceNote: 'Summarised by the team; please check against the original document.',

  recTitle: 'Data collection (research team)',
  recHelp: 'Only normalised joint coordinates are stored — no images or video. Use an anonymous ID, not a real name.',
  recSubject: 'Participant ID (anonymous)',
  recLabel: 'Posture being performed',
  recLabelCorrect: 'CORRECT posture',
  recLabelBent: 'Bent elbows',
  recLabelOff: 'Shoulders off-axis',
  recAngle: 'Camera angle',
  recAngleSide: 'Side 90°',
  recAngleDiag: 'Diagonal 45°',
  recAngleFront: 'Front 0°',
  recLight: 'Lighting',
  recLightBright: 'Bright',
  recLightDim: 'Dim',
  recDevice: 'Device (e.g. Pixel 6a)',
  recStart: 'Start recording',
  recStop: 'Stop recording',
  recRows: 'rows',
  showCamera: 'Show camera image on screen (never stored)',
  recTap: 'TAP FOR EVERY COMPRESSION (Space key)',
  recTapHelp: 'A second person taps each time they see a compression — an independent ground truth for the AI.',
  recDownload: 'Download CSV',
  recClear: 'Clear',

  limits: 'A practice aid for compression rate and arm posture from a 2D side view. It cannot measure compression depth (5–6 cm) and does not replace medical professionals or a certified CPR course.',
};

const dict: Record<Lang, Record<StringKey, string>> = { vi, en };

export function tr(lang: Lang) {
  const d = dict[lang];
  return (k: StringKey): string => d[k];
}

export type T = ReturnType<typeof tr>;
