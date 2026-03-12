# QR Checkout Game

Mini game dạng QR checkout - Người chơi đăng ký, đăng nhập và unlock 13 location trên bản đồ bằng cách scan QR code ngoài thực tế.

## Cấu trúc thư mục

```
qr-checkout/
├── client/          # React + Vite frontend
├── server/          # Node.js + Express backend
└── database.sql     # PostgreSQL schema
```

## Yêu cầu

- Node.js 18+
- PostgreSQL 14+

## Cài đặt

### 1. Database

Tạo database PostgreSQL và chạy schema:

```bash
# Tạo database
createdb qr_checkout

# Chạy schema
psql -d qr_checkout -f server/database.sql
```

### 2. Backend

```bash
cd server

# Copy .env.example và chỉnh sửa
cp .env.example .env
# Chỉnh sửa .env với thông tin database của bạn

# Install dependencies và chạy
npm install
npm run dev
```

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

## Cấu hình

### Backend (.env)
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qr_checkout
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
```

## Tạo tài khoản Admin

Sau khi chạy server, tạo tài khoản admin bằng cách update role trong database:

```sql
UPDATE users SET role = 'admin' WHERE username = 'admin';
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user

### Locations
- `GET /api/locations` - Lấy danh sách location (đã unlock của user)
- `POST /api/locations/scan` - Scan QR token
- `GET /api/locations/all` - Tất cả location (admin)
- `POST /api/locations` - Tạo location (admin)
- `GET /api/locations/:id/qr` - Tạo QR code (admin)
- `GET /api/locations/qr/all` - Tất cả QR codes (admin)

### Stats
- `GET /api/stats/top` - Top 50 user hoàn thành
- `API/stats/location-stats` - Thống kê unlock mỗi location
- `GET /api/stats/export/csv` - Export CSV (admin)
- `GET /api/stats/overview` - Tổng quan (admin)

## Cách chơi

1. User đăng ký tài khoản
2. Đăng nhập vào game
3. Xem bản đồ với 13 location cần unlock
4. Đến các điểm thực tế và scan QR code
5. Mỗi lần scan sẽ unlock location tương ứng
6. Khi unlock đủ 13 location sẽ nhận thông báo chúc mừng

## Deploy

### Backend
- Render / Railway / Heroku

### Frontend  
- Vercel / Netlify
