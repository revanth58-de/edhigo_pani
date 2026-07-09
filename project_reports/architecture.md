# 🏗️ Dinasari — System Architecture

## 1. Architecture Overview

```mermaid
flowchart TB
    subgraph Mobile["📱 React Native (Expo)"]
        UI["Screens & Components"]
        Nav["React Navigation"]
        State["Zustand Store"]
        TTS["expo-speech (Voice)"]
        QR["Camera + QR"]
        Maps["react-native-maps"]
    end

    subgraph Backend["⚙️ Node.js Backend"]
        API["Express REST API"]
        WS["Socket.io Server"]
        Auth["JWT + On-Screen OTP"]
        BL["Business Logic"]
    end

    subgraph Data["💾 Data Layer"]
        PG["PostgreSQL + PostGIS"]
        Redis["Redis Cache"]
        Cloud["Cloudinary (Images)"]
    end

    subgraph External["🌐 External Services"]
        GMap["Google Maps API"]
        OTPSvc["On-Screen OTP Service"]
        Pay["Razorpay / PhonePe"]
        FCM["Firebase Cloud Messaging"]
    end

    UI --> Nav
    UI --> State
    UI --> TTS
    UI --> QR
    UI --> Maps

    State --> API
    State --> WS
    Maps --> GMap

    API --> Auth
    API --> BL
    WS --> BL
    BL --> PG
    BL --> Redis
    BL --> Cloud

    Auth --> OTPSvc
    BL --> Pay
    BL --> FCM
```

---

## 2. Project Structure

```
dinasari/
├── mobile/                          # React Native (Expo)
│   ├── app.json
│   ├── src/
│   │   ├── navigation/
│   │   │   ├── AppNavigator.js      # Auth gate + role router
│   │   │   ├── FarmerNavigator.js
│   │   │   ├── WorkerNavigator.js
│   │   │   └── LeaderNavigator.js
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   │   ├── SplashScreen.js
│   │   │   │   ├── LanguageScreen.js
│   │   │   │   ├── LoginScreen.js
│   │   │   │   ├── OTPScreen.js
│   │   │   │   └── RoleSelectionScreen.js
│   │   │   ├── farmer/
│   │   │   │   ├── FarmerHomeScreen.js
│   │   │   │   ├── FarmerProfileScreen.js
│   │   │   │   ├── SelectWorkersScreen.js
│   │   │   │   ├── RequestSentScreen.js
│   │   │   │   ├── RequestAcceptedScreen.js
│   │   │   │   ├── ArrivalAlertScreen.js
│   │   │   │   ├── QRAttendanceINScreen.js
│   │   │   │   ├── WorkInProgressScreen.js
│   │   │   │   ├── QRAttendanceOUTScreen.js
│   │   │   │   ├── PaymentScreen.js
│   │   │   │   └── RateWorkerScreen.js
│   │   │   ├── worker/
│   │   │   │   ├── WorkerHomeScreen.js
│   │   │   │   ├── WorkerProfileScreen.js
│   │   │   │   ├── WorkerStatusScreen.js
│   │   │   │   ├── JobOfferScreen.js
│   │   │   │   ├── NavigationScreen.js
│   │   │   │   ├── QRScannerScreen.js
│   │   │   │   ├── AttendanceConfirmedScreen.js
│   │   │   │   └── RateFarmerScreen.js
│   │   │   └── leader/
│   │   │       ├── LeaderHomeScreen.js
│   │   │       ├── GroupSetupScreen.js
│   │   │       ├── GroupQRScreen.js
│   │   │       ├── GroupConfirmedScreen.js
│   │   │       ├── LiveMapScreen.js
│   │   │       └── RateFarmerScreen.js
│   │   ├── components/
│   │   │   ├── VoiceButton.js
│   │   │   ├── BottomNav.js
│   │   │   ├── EmojiRating.js
│   │   │   ├── StarRating.js
│   │   │   ├── CustomKeypad.js
│   │   │   ├── QRCodeDisplay.js
│   │   │   ├── QRScanner.js
│   │   │   ├── LiveTimer.js
│   │   │   ├── MassiveButton.js
│   │   │   └── MapView.js
│   │   ├── store/
│   │   │   ├── authStore.js
│   │   │   ├── jobStore.js
│   │   │   ├── locationStore.js
│   │   │   └── groupStore.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── socket.js
│   │   │   └── voice.js
│   │   ├── i18n/
│   │   │   ├── te.json              # Telugu
│   │   │   ├── hi.json              # Hindi
│   │   │   └── en.json              # English
│   │   └── theme/
│   │       ├── colors.js
│   │       ├── typography.js
│   │       └── spacing.js
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── server.js                # Entry point
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   ├── redis.js
│   │   │   └── env.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── validate.js
│   │   │   ├── rateLimiter.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── user.routes.js
│   │   │   ├── job.routes.js
│   │   │   ├── attendance.routes.js
│   │   │   ├── payment.routes.js
│   │   │   ├── rating.routes.js
│   │   │   ├── group.routes.js
│   │   │   └── location.routes.js
│   │   ├── controllers/
│   │   │   └── (mirrors routes)
│   │   ├── services/
│   │   │   ├── otp.service.js
│   │   │   ├── matching.service.js
│   │   │   ├── qr.service.js
│   │   │   ├── payment.service.js
│   │   │   └── notification.service.js
│   │   ├── models/                  # Prisma schema
│   │   └── socket/
│   │       ├── index.js
│   │       └── handlers/
│   │           ├── location.handler.js
│   │           └── job.handler.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 3. Database Schema

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar phone UK
        varchar name
        enum role "farmer|worker|leader"
        varchar language "te|hi|en"
        varchar village
        text photo_url
        float land_acres
        jsonb animals
        jsonb skills
        float rating_avg
        int rating_count
        point location
        enum status "available|working|break|offline"
        timestamp created_at
    }

    JOBS {
        uuid id PK
        uuid farmer_id FK
        enum work_type "sowing|harvesting|irrigation|labour|tractor"
        enum worker_type "individual|group"
        int workers_needed
        float pay_per_day
        point farm_location
        varchar farm_address
        enum status "pending|matched|in_progress|completed|cancelled"
        timestamp start_time
        timestamp end_time
        timestamp created_at
    }

    ATTENDANCE {
        uuid id PK
        uuid job_id FK
        uuid worker_id FK
        varchar qr_code_in
        varchar qr_code_out
        timestamp check_in
        timestamp check_out
        point check_in_location
        point check_out_location
        float hours_worked
    }

    PAYMENTS {
        uuid id PK
        uuid job_id FK
        uuid farmer_id FK
        uuid worker_id FK
        float amount
        enum method "cash|upi"
        varchar upi_ref
        enum status "pending|completed|failed"
        timestamp paid_at
    }

    RATINGS {
        uuid id PK
        uuid job_id FK
        uuid from_user_id FK
        uuid to_user_id FK
        enum emoji "happy|neutral|sad"
        int stars "1-5"
        timestamp created_at
    }

    GROUPS {
        uuid id PK
        uuid leader_id FK
        varchar name
        varchar qr_code
        enum status "forming|active|completed"
        timestamp created_at
    }

    GROUP_MEMBERS {
        uuid id PK
        uuid group_id FK
        uuid worker_id FK
        enum status "invited|joined|checked_in|checked_out"
        timestamp joined_at
    }

    JOB_APPLICATIONS {
        uuid id PK
        uuid job_id FK
        uuid worker_id FK
        uuid group_id FK "nullable"
        enum status "pending|accepted|rejected|withdrawn"
        float distance_km
        timestamp applied_at
    }

    USERS ||--o{ JOBS : posts
    USERS ||--o{ ATTENDANCE : "checks in"
    USERS ||--o{ RATINGS : "gives/receives"
    USERS ||--o{ GROUPS : leads
    JOBS ||--o{ ATTENDANCE : tracks
    JOBS ||--o{ PAYMENTS : "paid for"
    JOBS ||--o{ RATINGS : "rated in"
    JOBS ||--o{ JOB_APPLICATIONS : receives
    GROUPS ||--o{ GROUP_MEMBERS : contains
```

---

## 4. REST API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/send-otp` | Send OTP to phone |
| POST | `/api/auth/verify-otp` | Verify OTP, return JWT |
| POST | `/api/auth/set-role` | Set user role after first login |
| GET | `/api/auth/me` | Get current user profile |

### Users
| Method | Path | Description |
|--------|------|-------------|
| PUT | `/api/users/profile` | Update profile (name, photo, skills, animals) |
| PUT | `/api/users/language` | Set preferred language |
| PUT | `/api/users/status` | Set availability status |
| PUT | `/api/users/location` | Update GPS location |

### Jobs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/jobs` | Create job request |
| GET | `/api/jobs/nearby` | Find nearby jobs (worker) |
| GET | `/api/jobs/:id` | Get job details |
| PUT | `/api/jobs/:id/cancel` | Cancel job request |
| POST | `/api/jobs/:id/apply` | Apply/accept job |
| PUT | `/api/jobs/:id/status` | Update job status |

### Attendance
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/attendance/generate-qr` | Generate QR for check-in/out |
| POST | `/api/attendance/scan` | Scan QR to record attendance |
| GET | `/api/attendance/job/:jobId` | Get attendance for a job |

### Payments
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments` | Record cash payment |
| POST | `/api/payments/upi` | Generate UPI QR |
| PUT | `/api/payments/:id/confirm` | Confirm payment received |

### Ratings
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ratings` | Submit rating (emoji + stars) |
| GET | `/api/ratings/user/:userId` | Get user's ratings |

### Groups
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/groups` | Create group |
| POST | `/api/groups/:id/join` | Join via QR code |
| DELETE | `/api/groups/:id/members/:memberId` | Remove member |
| GET | `/api/groups/:id/members` | Get member list & status |

---

## 5. Socket.io Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `location:update` | Client → Server | `{lat, lng}` | Worker sends GPS updates |
| `location:broadcast` | Server → Client | `{userId, lat, lng}` | Farmer sees worker on map |
| `job:new-offer` | Server → Client | `{job}` | Push job offer to nearby workers |
| `job:accepted` | Server → Client | `{worker, eta}` | Notify farmer of acceptance |
| `job:arrived` | Server → Client | `{worker}` | Worker arrival alert |
| `group:member-joined` | Server → Client | `{member}` | Notify leader of new member |
| `attendance:checked-in` | Server → Client | `{worker}` | Confirm QR scan success |

---

## 6. Security Model

| Layer | Implementation |
|-------|---------------|
| **Auth** | Phone + On-Screen OTP → JWT (access 15m + refresh 30d) |
| **Transport** | HTTPS everywhere, WSS for sockets |
| **API** | Rate limiting (100 req/min), request validation |
| **Data** | Encrypted at rest (PostgreSQL), no PII in logs |
| **Payments** | Server-side UPI QR generation, no card data stored |
| **Location** | Geo-fence validation for attendance (within 100m of farm) |
| **QR Codes** | Time-limited tokens (5-min expiry), single-use |

---

## 7. Offline-First Strategy

| Scenario | Solution |
|----------|----------|
| No network during QR scan | Cache QR data locally, sync when online |
| GPS navigation offline | Download tile cache for farm area |
| Profile edits offline | Queue mutations in AsyncStorage, sync on reconnect |
| Lost connection mid-work | Timer continues locally, syncs duration on reconnect |
