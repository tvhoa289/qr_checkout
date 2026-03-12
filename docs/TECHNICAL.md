# TECHNICAL DOCUMENT
## Mini Game QR Checkout

---

## 1. Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │  Web Browser    │     │   Admin Web    │
│  (WebView)     │     │  (Desktop)      │     │   (Admin)       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                         ┌───────▼───────┐
                         │  Load Balancer │
                         │   (CORS)      │
                         └───────┬───────┘
                                 │
                    ┌──────────────▼──────────────┐
                    │     Node.js + Express       │
                    │         Backend             │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      PostgreSQL            │
                    │       Database             │
                    └───────────────────────────┘
```

---

## 2. Database Schema

### 2.1. Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',  -- 'user' or 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP  -- Khi unlock đủ 13 locations
);
```

### 2.2. Locations Table
```sql
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),  -- Tên location (VD: "Cổng chính")
    token VARCHAR(16) UNIQUE NOT NULL,  -- QR token random 16 ký tự
    x_position INTEGER DEFAULT 0,  -- Vị trí marker trên map (0-100%)
    y_position INTEGER DEFAULT 0,  -- Vị trí marker trên map (0-100%)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3. User Locations Table
```sql
CREATE TABLE user_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, location_id)  -- Mỗi user chỉ unlock 1 location 1 lần
);
```

### 2.4. Indexes
```sql
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_completed_at ON users(completed_at);
CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_user_locations_location_id ON user_locations(location_id);
CREATE INDEX idx_locations_token ON locations(token);
```

---

## 3. API Endpoints

### 3.1. Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Đăng ký tài khoản | No |
| POST | `/api/auth/login` | Đăng nhập | No |
| GET | `/api/auth/me` | Lấy thông tin user | Yes |

**Register Request:**
```json
{
  "username": "user123",
  "email": "user@example.com",
  "phone": "0912345678",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### 3.2. Locations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/locations` | Lấy danh sách locations (đã unlock của user) | Yes |
| POST | `/api/locations/scan` | Scan QR token | Yes |
| GET | `/api/locations/all` | Tất cả locations (admin) | Yes (admin) |
| POST | `/api/locations` | Tạo location mới | Yes (admin) |
| PUT | `/api/locations/:id` | Cập nhật location | Yes (admin) |
| DELETE | `/api/locations/:id` | Xóa location | Yes (admin) |
| GET | `/api/locations/:id/qr` | Tạo QR code | Yes (admin) |
| GET | `/api/locations/qr/all` | Tất cả QR codes | Yes (admin) |

**Scan Response:**
```json
{
  "message": "Location unlocked successfully!",
  "location": { "id": 1, "name": "Location 1" },
  "progress": {
    "completed": 5,
    "total": 13,
    "is_completed": false
  }
}
```

### 3.3. Statistics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/stats/top` | Top 50 user hoàn thành | Yes |
| GET | `/api/stats/location-stats` | Số người unlock mỗi location | Yes |
| GET | `/api/stats/export/csv` | Export CSV | Yes (admin) |
| GET | `/api/stats/overview` | Tổng quan | Yes (admin) |

---

## 4. Security

### 4.1. Authentication Flow
1. User đăng ký → Password hash với bcrypt (10 rounds)
2. User đăng nhập → So sánh password → Generate JWT token
3. JWT chứa: `{ id, username, role }`
4. Token expires sau 7 ngày
5. Các API protected cần header: `Authorization: Bearer <token>`

### 4.2. QR Token
- Random 16 ký tự (UUID không dấu)
- Không thể đoán hoặc brute force
- Token được lưu trong database, không có cơ chế expire

### 4.3. Admin Routes
- Kiểm tra `req.user.role === 'admin'`
- Middleware `requireAdmin()` check trước khi xử lý

---

## 5. Frontend Architecture

### 5.1. Pages Structure
```
/                 → Redirect to /game
/login            → Login page
/register         → Register page
/game             → Game page (protected)
/stats            → Statistics page (protected)
/admin            → Admin dashboard (protected, admin only)
/scan             → Scan result page (protected)
```

### 5.2. Key Components

**Game Page:**
- Progress bar component
- Map container với markers
- QR Scanner component (html5-qrcode)
- Manual token input

**Admin Page:**
- Tabs: Locations / QR Codes
- Overview cards
- Data tables
- QR image download

### 5.3. State Management
- React Context cho Auth state
- Local state cho component khác

---

## 6. QR Code Flow

### 6.1. QR Generation (Admin)
```
1. Admin call GET /api/locations/:id/qr
2. Server generate QR URL: http://192.168.1.4:5173/scan?token=abc123...
3. Server generate QR image (base64)
4. Admin download QR → Print → Dán tại location
```

### 6.2. QR Scan (User)
```
1. User click "Quét QR Code"
2. Camera opens (rear camera)
3. User scan QR at location
4. Extract token from URL or raw text
5. Call POST /api/locations/scan with token
6. Server validates token → Insert user_locations
7. Return success → Update UI → Show message
```

---

## 7. Environment Variables

### 7.1. Server (.env)
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qr_checkout
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
SERVER_URL=http://192.168.1.4:5173
```

### 7.2. Client (.env)
```env
VITE_API_URL=http://192.168.1.4:3001/api
```

---

## 8. Deployment

### 8.1. Development
- Client: `npm run dev` (localhost:5173)
- Server: `npm run dev` (localhost:3001)

### 8.2. Production
- **Frontend:** Vercel / Netlify
- **Backend:** Render / Railway / Heroku
- **Database:** Render PostgreSQL / Supabase

### 8.3. Environment for Production
- Set `CLIENT_URL` = domain production
- Set `SERVER_URL` = domain production  
- Set `JWT_SECRET` = random secure string

---

## 9. Testing Checklist

### 9.1. Functional
- [ ] Đăng ký user mới
- [ ] Đăng nhập thành công
- [ ] Đăng nhập sai password
- [ ] Scan QR hợp lệ
- [ ] Scan QR trùng lặp
- [ ] Scan QR không hợp lệ
- [ ] Nhập token thủ công
- [ ] Xem top users
- [ ] Export CSV (admin)
- [ ] Tạo location mới (admin)
- [ ] Generate QR codes (admin)

### 9.2. Mobile
- [ ] Đăng nhập trên mobile
- [ ] Xem map trên mobile
- [ ] Scan QR với camera
- [ ] Manual token input

### 9.3. Security
- [ ] Không đăng nhận được với token giả
- [ ] Admin routes chỉ admin truy cập được
- [ ] Password không lưu plain text

---

## 10. Appendix

### A. Dependencies

**Server:**
- express
- pg (PostgreSQL)
- bcryptjs
- jsonwebtoken
- cors
- dotenv
- uuid
- qrcode

**Client:**
- react
- react-router-dom
- axios
- html5-qrcode

### B. File Structure
```
qr-checkout/
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/           # API calls
│   │   ├── context/       # Auth context
│   │   ├── pages/         # Page components
│   │   └── App.css        # Styles
│   └── public/
│       └── map.png        # Game map
├── server/                # Node.js backend
│   ├── config/
│   │   └── db.js         # Database config
│   ├── middleware/
│   │   └── auth.js       # Auth middleware
│   ├── routes/
│   │   ├── auth.js       # Auth routes
│   │   ├── locations.js  # Location routes
│   │   └── stats.js      # Stats routes
│   ├── index.js          # Entry point
│   ├── seed.js           # Database seeder
│   └── database.sql      # Schema
└── docs/
    ├── PROPOSAL.md       # Project proposal
    └── TECHNICAL.md      # This document
```

---

*Technical Document - Last Updated: 2026-03-10*
