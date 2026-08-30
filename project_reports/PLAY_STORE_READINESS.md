# Dinasari — Google Play Store Final Release & Submission Checklist

This document is the **single source of truth** for all pre-submission tasks, release prerequisites, and manual verification steps required to publish **Dinasari** (`com.dinasari.app`) to the Google Play Console.

---

## 🎯 Phase 1: Codebase & Automated Verification Status (Completed)

- [x] **Committed DB Files Untracked**: Removed SQLite `.db` binaries from git index; updated `.gitignore`.
- [x] **Google Maps API Key Dynamic Injection**: Extracted hardcoded key from `app.json` to dynamic `mobile/app.config.js` via `.env`.
- [x] **Backend URLs Unified**: Configured production base domain `https://www.dinasari.co.in` in `eas.json` and mobile configs.
- [x] **Backend Startup Secrets Self-Check**: Fail-loud validation on boot for all 12 production secrets, placeholder detection, and database type check in `backend/src/config/env.js`.
- [x] **Privacy Policy Hosting Route**: Public route `/privacy` (and aliases `/privacy-policy`) configured in `server.js` and `firebase.json` mapping to DPDP Act 2023 compliant `admin/privacy-policy.html`.
- [x] **Database Migration Safety Rule**: Configured Docker CMD to run `npx prisma migrate deploy && node src/server.js`; documented never to use `db push` in production.
- [x] **Automated CI Workflows**: Created `.github/workflows/backend-tests.yml` with Postgres 15 service container and security audit gate.
- [x] **NPM Dependency Security Audit**: Fixed high-severity `ws` / `socket.io-adapter` vulnerabilities; documented known build-time `@prisma/config` tooling advisory.
- [x] **Smoke-Test Tooling**: Created `backend/scripts/smoke-test-production.js` for zero-risk production health and contract checks.
- [x] **Automated Test Suite**: 16/16 backend suites passing (154/154 tests); 11/11 mobile suites passing (99/99 tests).

---

## 🔑 Phase 2: Live Backend & Infrastructure Deployment (Action Required by You)

Before launching the mobile app or uploading to the store, configure your hosting provider (Render / AWS / Railway):

- [ ] **Configure 12 Production Secrets in Cloud Dashboard**:
  - [ ] `DATABASE_URL`: Hosted PostgreSQL connection string with `sslmode=require` (Neon / AWS RDS / Supabase).
  - [ ] `JWT_SECRET`: Random 64+ char secret string.
  - [ ] `JWT_REFRESH_SECRET`: Distinct random secret string.
  - [ ] `ADMIN_SECRET`: Strong password for `/api/admin/login`.
  - [ ] `ADMIN_JWT_SECRET`: Distinct admin token signing key.
  - [ ] `FAST2SMS_API_KEY`: Live Fast2SMS Indian SMS Gateway key.
  - [ ] `RAZORPAY_KEY_ID`: Live Razorpay key (`rzp_live_...`).
  - [ ] `RAZORPAY_KEY_SECRET`: Live Razorpay secret key.
  - [ ] `CLOUDINARY_CLOUD_NAME`: Production Cloudinary account name.
  - [ ] `CLOUDINARY_API_KEY`: Production Cloudinary API key.
  - [ ] `CLOUDINARY_API_SECRET`: Production Cloudinary API secret.
  - [ ] `SENTRY_DSN`: Production backend Sentry DSN.
  - [ ] `GEOFENCE_ENABLED`: Set to `true` (enforces 100m GPS radius for check-ins).
  - [ ] `ALLOWED_ORIGIN`: Set to `https://www.dinasari.co.in`.
- [ ] **Deploy Latest Backend Commit**:
  - Trigger deployment from `main` branch.
  - Confirm container logs show: `✔ Generated Prisma Client` and `Applying migration...` followed by `✅ Production environment self-check passed`.
- [ ] **Run Live Smoke Test**:
  ```bash
  node backend/scripts/smoke-test-production.js https://www.dinasari.co.in
  ```
  - Verify all 4 checks pass: Health (200), Privacy (200), Admin (200), Auth schema (400/200).

---

## 🔒 Phase 3: Android Keystore & Google Cloud Console (Action Required by You)

- [ ] **Generate Production Upload Keystore** (Keep in a secure vault, NEVER commit to git):
  ```bash
  keytool -genkeypair -v -storetype PKCS12 -keystore dinasari-release-key.jks \
    -alias dinasari-key-alias -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] **Extract SHA-1 Certificate Fingerprint**:
  ```bash
  keytool -list -v -keystore dinasari-release-key.jks -alias dinasari-key-alias
  ```
- [ ] **Restrict Google Maps API Key in Google Cloud Console**:
  - Open [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials).
  - Select Maps API Key (`AIzaSyCa2HegR7olgi1xLuvDHo4-PM_--S7_OxU`).
  - Set **Application restrictions** → **Android apps**.
  - Add Package Name: `com.dinasari.app`.
  - Add SHA-1 Fingerprint: (From your upload keystore AND Google Play App Signing certificate once created).
  - Set **API restrictions** → Restrict to **Maps SDK for Android**, **Places API**, **Geocoding API**, and **Directions API**.

---

## 🎨 Phase 4: Play Store Visual Assets (Action Required by You)

Capture real app screens using the ADB fast-capture script documented in `mobile/store/STORE_LISTING.md`:

- [ ] **App Icon**: 512 × 512 px PNG (32-bit with alpha, max 1024 KB).
- [ ] **Feature Graphic**: 1024 × 500 px JPEG/PNG (no alpha, max 15 MB).
- [ ] **Phone Screenshots (Capture 6 key flows)**:
  - [ ] `01_splash_language.png`: Welcome & Language Selector (Telugu, Kannada, Hindi, English).
  - [ ] `02_role_selection.png`: Farmer / Worker / Group Leader persona cards.
  - [ ] `03_farmer_dashboard.png`: Farm job creation form.
  - [ ] `04_live_map_navigation.png`: Google Maps live worker tracking & turn-by-turn routing.
  - [ ] `05_qr_attendance.png`: Contactless QR code check-in scanner with geofence badge.
  - [ ] `06_earnings_wallet.png`: Worker digital wage settlement & PDF statement export.

---

## 📱 Phase 5: Release Build & Physical Device Testing

- [ ] **Compile Android App Bundle (AAB)**:
  ```bash
  cd mobile
  # Using EAS Build (Recommended for Expo):
  npm run build:eas
  
  # Or local Android build:
  npm run build:android
  ```
- [ ] **Complete 32-Screen Physical Device Walkthrough** (Detailed in `mobile/TESTING_GUIDE.md`):
  - [ ] Farmer Flow: OTP Login → Post Job → Select Worker → QR Check-in Out → Razorpay Payment → Rate Worker.
  - [ ] Worker Flow: OTP Login → Accept Job → Live Map Route → QR Scan Check-in → PDF Statement.
  - [ ] Group Leader Flow: Add Members → Accept Group Job → Group QR Scan → Attendance Verification.
  - [ ] Network Test: Airplane mode toggle to verify offline banner and graceful sync retry.

---

## 🚀 Phase 6: Google Play Console Submission

- [ ] **Store Listing Details**:
  - Title: `Dinasari` (from `mobile/store/STORE_LISTING.md`)
  - Short Description: `Connect farmers with local agricultural workers. Instant job matching.`
  - Full Description: Paste from `mobile/store/STORE_LISTING.md`.
  - Category: `Business` | Content Rating: `Everyone`.
- [ ] **App Content & Policies**:
  - Privacy Policy URL: `https://www.dinasari.co.in/privacy`
  - Target Audience: 18 and older.
  - Data Safety: Fill based on `mobile/store/privacy_policy.md` (Phone number for auth, Location for live job matching, Camera for QR scanning).
  - Financial Features Declaration: Declare digital daily wage settlement via Razorpay.
- [ ] **Upload AAB to Closed Testing / Production Track** → Submit for Review!
