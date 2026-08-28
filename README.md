# 🏸 Đoàn Thượng Badminton - Hệ Thống Xếp Hạng BWF & Kết Nối Trực Tuyến

Hệ thống web xếp hạng tích điểm cầu lông tiêu chuẩn **BWF (Badminton World Federation)** dành riêng cho học sinh và câu lạc bộ Trường THPT Đoàn Thượng. 

Trang web được thiết kế để **chạy trực tiếp 24/7 trên GitHub Pages** và **đồng bộ dữ liệu thời gian thực (Real-time Sync) trên tất cả các thiết bị** (điện thoại của học sinh, máy tính ban quản trị) mà không cần thuê máy chủ.

---

## 🌟 Tính Năng Nổi Bật

1. **Bảng xếp hạng chuẩn BWF (5 Nội dung):**
   - **Đơn Nam (MS)**, **Đơn Nữ (WS)**, **Đôi Nam (MD)**, **Đôi Nữ (WD)**, **Đôi Nam Nữ (XD)**.
   - Hiển thị thứ hạng (Rank), huy chương Top 1-2-3, biến động (+/-), số giải đã đấu, tổng điểm BWF tích lũy.

2. **Cơ chế ghép đôi đặc thù:**
   - Để 1 cặp đôi (MD, WD, XD) xuất hiện trên Bảng xếp hạng, 2 thành viên **phải kết bạn** và **cả 2 bạn phải bấm chấp thuận (đồng ý)**.

3. **Tài khoản & Phân quyền:**
   - **2 Tài khoản Admin mặc định** dành riêng cho 2 Quản trị viên (Nguyễn Đức Nhật Minh & Nguyễn Đức Hiếu).
   - Tính năng **Đổi mật khẩu** cho cả học sinh và Admin.
   - Đăng ký tài khoản học sinh nhanh chóng.

4. **Bạn bè & Nhắn tin trực tuyến (Real-time Chat):**
   - Tìm kiếm học sinh theo tên/lớp.
   - Gửi lời mời kết bạn, quản lý danh sách bạn bè.
   - Khung chat trực tiếp riêng tư giữa 2 người bạn.

5. **Sảnh Ghép Trận Cầu Lông (Matchmaking):**
   - Đăng kèo giao lưu: Khung giờ, Địa điểm sân thể chất, Thể loại, Số người.
   - Nút **"Tham gia" / "Rút lui"** trực tiếp.

6. **Tin tức, Hình ảnh & Tài liệu giải đấu:**
   - Admin đăng bài viết thông báo, tải ảnh giải đấu và đính kèm tài liệu (file PDF, Word điều lệ giải).
   - Học sinh có thể xem và tải tài liệu về máy.

7. **Bảng điều khiển Admin BQT:**
   - Cộng/trừ điểm xếp hạng BWF kèm giải đấu và lý do.
   - Quản lý học sinh: Thêm thủ công, Đổi mật khẩu học sinh quên pass, Xóa thành viên.
   - Quản lý cặp đôi thi đấu.

---

## 🚀 Hướng Dẫn Tải Lên GitHub & Kích Hoạt GitHub Pages

### Bước 1: Tạo Repository trên GitHub
1. Truy cập [https://github.com/new](https://github.com/new)
2. Đặt tên Repository (ví dụ: `doan-thuong-badminton`)
3. Chọn chế độ **Public**
4. Bấm **Create repository**

### Bước 2: Đẩy mã nguồn lên GitHub
Kéo thả toàn bộ các file trong thư mục `doan-thuong-badminton` vào giao diện Upload files của GitHub.

### Bước 3: Bật GitHub Pages để chạy trực tuyến miễn phí
1. Tại trang Repository trên GitHub, bấm vào tab **Settings** (Cài đặt)
2. Chọn mục **Pages** ở menu bên trái
3. Tại phần **Build and deployment > Branch**:
   - Chọn nhánh **`main`**
   - Chọn thư mục **`/(root)`**
   - Bấm **Save**
4. Đợi khoảng 1 phút, GitHub sẽ cung cấp đường link trực tuyến:
   `https://<TEN-TAI-KHOAN-GITHUB>.github.io/doan-thuong-badminton/`
