# 🛠️ FarmConnect — Tech Stack

## Frontend (Mobile)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React Native (Expo SDK 52+) | Cross-platform iOS/Android, fast iteration, OTA updates |
| **Navigation** | React Navigation v6 | Role-based navigators, deep linking |
| **State** | Zustand | Lightweight, no boilerplate, offline-friendly |
| **Forms** | React Hook Form | Minimal but enough for profile screens |
| **Maps** | react-native-maps (Google Maps) | Live navigation, worker discovery |
| **QR Code** | expo-camera + react-native-qrcode-svg | Scan & generate QR attendance codes |
| **Voice/TTS** | expo-speech | Telugu/Hindi/English text-to-speech guidance |
| **Animations** | react-native-reanimated v3 | Pulse rings, radar animation, transitions |
| **Icons** | @expo/vector-icons (MaterialIcons) | Matching the Material Symbols from mocks |
| **Storage** | AsyncStorage + expo-secure-store | Offline data cache + secure token storage |
| **HTTP** | Axios | API communication with interceptors |
| **i18n** | i18next + react-i18next | Telugu / Hindi / English translations |

---

## Backend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Node.js 20 LTS | JavaScript full-stack consistency |
| **Framework** | Express.js | Lightweight, well-documented REST API |
| **Real-time** | Socket.io | Live location updates, job notifications, arrival alerts |
| **Auth** | JWT + On-Screen OTP | Phone-based auth, OTP displayed in-app (no SMS cost) |
| **Validation** | Joi / Zod | Request validation middleware |
| **File Upload** | Multer + Cloudinary | Profile photos |
| **Rate Limiting** | express-rate-limit | API abuse protection |
| **Logging** | Winston | Structured logging |

---

## Database

| Store | Technology | Usage |
|-------|-----------|-------|
| **Primary DB** | PostgreSQL 15 | Users, jobs, attendance, payments, ratings |
| **Cache/Queue** | Redis 7 | Session cache, real-time worker locations, job matching queue |
| **ORM** | Prisma | Type-safe queries, migrations, seeding |

> [!TIP]
> PostgreSQL's PostGIS extension enables geospatial queries for nearby worker discovery and geo-fenced attendance validation.

---

## Key Integrations

| Service | Provider | Purpose |
|---------|----------|---------|
| **Maps/Geocoding** | Google Maps Platform | Navigation, live tracking, place search |
| **OTP** | Server-Generated (On-Screen) | OTP displayed in-app, no SMS cost |
| **Payments** | Razorpay / PhonePe SDK | UPI QR generation, payment processing |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Job alerts, arrival notifications |
| **Analytics** | Firebase Analytics | User engagement, funnel tracking |
| **Crash Reporting** | Sentry | Error monitoring |

---

## DevOps & Deployment

| Layer | Technology |
|-------|-----------|
| **CI/CD** | GitHub Actions |
| **Mobile Builds** | EAS Build (Expo) |
| **OTA Updates** | EAS Update |
| **Backend Hosting** | Railway / Render / AWS EC2 |
| **Database Hosting** | Neon (PostgreSQL) or Supabase |
| **Container** | Docker + docker-compose |
| **Monitoring** | Sentry + Uptime Robot |

---

## Dependency Summary

```
Frontend: ~15 packages (Expo manages most)
Backend:  ~12 packages
Database: PostgreSQL + Redis (2 services)
External: 4 API integrations (Maps, SMS, Payments, Push)
```
