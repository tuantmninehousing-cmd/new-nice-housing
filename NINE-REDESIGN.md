# Nine Housing – giao diện mới (nhánh `nine-redesign`, 22/11/2026)

Thay giao diện trang ngoài sang navy + vàng theo logo Nine Housing "Live your way". Không đổi cơ sở dữ liệu, không đổi API, không đổi trang quản trị.

## Thay đổi
- `src/app/nine.css` (mới, nạp sau `globals.css` trong `layout.tsx`): bảng màu mới, đầu trang cao 104px (70px trên điện thoại), trang chủ, chân trang, nút chat.
- `src/views/HomeView/HomeView.tsx`: trang chủ mới gồm 5 mục `#gioi-thieu`, `#toa-nha`, `#dat-phong`, `#khuyen-mai`, `#lien-he`.
  - Tòa nhà, hạng phòng, giá lấy từ `src/data/nine.ts` (theo BÁO GIÁ NGẮN HẠN 10/10/2026, đơn vị nghìn đồng/đêm).
  - Nút "Đặt phòng" mở trang chi tiết của property tương ứng trong admin (ghép theo tên/địa chỉ bằng `match` trong `nine.ts`); tòa chưa có property thì cuộn xuống mục Liên hệ.
  - Mục Khuyến mãi lấy 3 bài mới nhất từ `/api/blogs` (anh Tuấn đăng khuyến mãi ở mục Blogs trong admin).
- `src/components/Layout/Navbar.tsx`, `Footer.tsx`: logo cố định `public/nine-logo.svg`, menu 5 mục, hotline, chuyển 4 ngôn ngữ.
- `src/components/Nine/ChatNine.tsx`: nút "Chat với Nine" (tạm dẫn sang Zalo/hotline; chỗ gắn agent Nine: phần tử `#nine-chat-root`).
- `src/context/LanguageContext.tsx`: thêm tiếng Nhật (`ja`) và Hàn (`ko`); thiếu khóa thì dùng tiếng Anh; mặc định tiếng Việt, lần đầu chọn theo ngôn ngữ trình duyệt.
- `src/i18n/ja.json`, `ko.json` (mới); `vi.json`, `en.json`: Blogs → Khuyến mãi/Offers, địa chỉ văn phòng 136 Vũ Miên, hotline 0968.071.393.
- `public/nine/*.jpg`: ảnh tòa nhà (480×360, tạm) và ảnh đầu trang; nên thay ảnh đầu trang bằng ảnh lớn hơn (≥1920px).

## Đưa lên máy chủ
```bash
git fetch && git checkout nine-redesign   # hoặc: git apply nine-redesign.patch
npm ci
npm run build
# khởi động lại tiến trình đang chạy `next start -p 3030` (pm2 restart ... / systemctl restart ...)
```

## Chưa làm (bước sau)
- Nối Bluejay Booking Engine (phòng trống, giá theo ngày, tạo đơn): cần route phía máy chủ giữ API key, và IP máy chủ được Bluejay cho phép.
- Gắn agent Nine vào khung chat.
- Chưa chạy `next build` thật trong môi trường soạn mã (không cài được gói); đã kiểm tra cú pháp, kiểu dữ liệu cơ bản và dựng thử giao diện bằng esbuild + React 19.
