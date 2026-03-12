# PROPOSAL
## Mini Game QR Checkout - Dự Án Khám Phá Địa Điểm

---

## 1. Tổng Quan Dự Án

**QR Checkout** là mini game dạng location-based, kết hợp giữa trải nghiệm thực tế và digital. Người chơi sẽ đăng ký tài khoản, sau đó khám phá 13 địa điểm thực tế được đánh dấu trên bản đồ bằng cách quét mã QR tại mỗi điểm.

### Mục tiêu:
- Tạo trải nghiệm tương tác cho khách hàng/người chơi
- Thu hút người dùng đến các địa điểm thực tế
- Thu thập dữ liệu thống kê về hành vi người chơi

---

## 2. Tính Năng Chính

### 2.1. Authentication
- Đăng ký: Username, Email, Số điện thoại, Password
- Đăng nhập với Email + Password
- Phân quyền: User thường / Admin

### 2.2. Game Page
- Hiển thị câu chuyện game (story)
- Map tĩnh với 13 location markers
- Trạng thái unlock/locked cho mỗi location
- Progress bar hiển thị tiến độ
- Nút scan QR code

### 2.3. QR Scanner
- Sử dụng camera trên mobile để scan
- Hỗ trợ QR dạng URL: `http://domain/scan?token=xxx`
- Nhập token thủ công khi camera không hoạt động

### 2.4. Thống Kê (Stats Page)
- Top 50 user hoàn thành nhanh nhất
- Số lượng người unlock mỗi location
- Export CSV (Admin only)

### 2.5. Admin Dashboard
- Tạo và quản lý 13 locations
- Tạo QR codes cho từng location
- Download QR codes
- Xem tổng quan thống kê

---

## 3. Danh Sách Đầu Việc

### Phase 1: Setup & Infrastructure
- [ ] Thiết lập server Node.js + Express
- [ ] Thiết lập PostgreSQL database
- [ ] Cấu hình CI/CD (nếu cần)

### Phase 2: Backend Development
- [ ] Auth API (register, login, JWT)
- [ ] Locations API CRUD
- [ ] QR Scan API (verify token, unlock location)
- [ ] Stats API (top users, location stats, export CSV)

### Phase 3: Frontend Development
- [ ] Login & Register pages
- [ ] Game page với map và markers
- [ ] QR Scanner tích hợp camera
- [ ] Stats page
- [ ] Admin dashboard

### Phase 4: Testing & Deployment
- [ ] Unit tests
- [ ] Integration tests
- [ ] Deployment lên production
- [ ] Setup monitoring

---

## 4. Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT |
| QR Scanner | html5-qrcode |
| QR Generation | qrcode |
| Deployment | Vercel + Render |

---

## 5. Lưu Ý Quan Trọng

### Mobile Support
- Webapp phải responsive cho cả mobile và desktop
- QR Scanner sử dụng camera sau (environment)
- QR URLs phải dùng domain/IP có thể truy cập từ mobile

### Security
- Password được hash với bcrypt
- JWT token với expiration
- Admin routes được protect
- QR token random 16 ký tự không thể đoán

---

## 6. Timeline Dự Kiến

- **Phase 1-2:** 2-3 ngày
- **Phase 3:** 3-4 ngày  
- **Phase 4:** 1-2 ngày

**Tổng:** ~1 tuần

---

## 7. Chi Phí Dự Kiến

- Domain: ~300k VNĐ/năm
- Hosting: Miễn phí (Vercel + Render free tier)
- Database: Miễn phí (Render free PostgreSQL)

**Tổng:** ~300k VNĐ/năm

---

*Proposal được viết bởi Senior Developer*
