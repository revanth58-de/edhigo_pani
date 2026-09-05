# Dinasari — Google Play Store Listing Metadata

## 1. App Metadata Details

*   **App Name:** Dinasari
*   **Short Description (Max 80 characters):**
    Connect farmers with local agricultural workers. Instant job matching.
*   **Category:** Business / Productivity
*   **Target Audience:** 18 and over

---

## 2. Full Description (Max 4000 characters)

**Dinasari** connects farmers directly with skilled agricultural laborers in rural India. Designed with a voice-first, low-literacy interface supporting Telugu, Hindi, and English, Dinasari ensures that if someone cannot read, they can still easily find work or hire workers.

### Key Features:

#### 🚜 For Farmers:
*   **Instant Postings:** Select crop and work type (sowing, harvesting, irrigation, manual labor, machinery rentals) with simple oversized touch grids.
*   **Geospatial Matching:** Locate nearby available workers or group leaders on a live map in real time.
*   **Geo-fenced QR Check-in/out:** Verify attendance securely. Workers must be physically on the farm (within 100m) to check in or out.
*   **Wage Calculator:** Automatically calculates hourly or daily wages based on checkout times, eliminating disputes.
*   **0% MDR Payments:** Pay workers instantly and directly using Cash or integrated UPI deep links (zero platform surcharge).
*   **Emoji-based Feedback:** Rate worker performance using simple emojis.

#### 🔧 For Workers:
*   **Online/Offline Toggles:** Set your availability status with a single tap.
*   **Personalized Shifts:** Receive instant job offers nearby with pay rate, distance, and farmer ratings.
*   **Turn-by-turn Directions:** Navigate directly to farm fields using integrated maps.
*   **QR Scanner:** Check in and check out by scanning the farmer’s code.
*   **Earnings Wallet:** View full payments history and download verified earnings statements.

#### 👥 For Group Leaders:
*   **Collective Management:** Invite and coordinate entire teams of workers.
*   **Group QR Code:** Show a single QR code for simultaneous group check-in/out.
*   **Split Payments:** Manage group job bookings and distribute earnings fairly among members.

Simplify your farming work and labor management with Dinasari today!

## Keywords
agriculture, farmers, farm workers, agricultural labor, farming jobs, krishi, kisan, rural jobs, daily wage, farm help

## Category
Business

## Content Rating
Everyone

## Contact Details
- Email: support@dinasari.co.in
- Website: https://www.dinasari.co.in
- Privacy Policy: https://www.dinasari.co.in/privacy

## Required Assets for Play Console
- App icon: 512x512 PNG (source: assets/icon.png — resize to 512x512)
- Feature graphic: 1024x500 PNG (create a branded banner)
- Screenshots: Minimum 2 per form factor (phone)
  - Recommended: 5-8 screenshots showcasing key screens
  - Aspect ratio: 16:9 or 9:16
  - Minimum dimension: 320px, maximum: 3840px

---

## 📌 TODO: Visual Assets Checklist for Play Console Submission

> **Note for Release Manager**: No placeholder or mock graphics are stored in the repo. Real device screenshots and brand artwork must be captured and uploaded directly to the Google Play Console before store publication.

| Asset Type | Play Console Specifications | Status / Action Required |
|---|---|---|
| **App Icon** | 512 × 512 px, 32-bit PNG (with alpha), max 1024 KB | 🔲 Export from `mobile/assets/icon.png` at 512×512 |
| **Feature Graphic** | 1024 × 500 px, JPEG or 24-bit PNG (no alpha), max 15 MB | 🔲 Design branded agricultural marketing banner (1024×500) |
| **Phone Screenshots** | Minimum 2 (recommended: 6–8), 16:9 or 9:16 ratio, min 320px, max 3840px (e.g., 1080×1920 or 1080×2400 PNG/JPEG) | 🔲 Capture from physical device or Android emulator using the ADB guide below |
| **Tablet Screenshots** (Optional) | 7-inch & 10-inch screenshots if targeting tablet distribution | 🔲 Optional for initial release |

### 📸 Recommended Screenshot Capture Order (6 Key Screens)

For the strongest user conversion in the Google Play Store, capture screens in this sequence:

1. **Screen 1 — Welcome & Language Selection**: Shows Telugu, Kannada, Hindi, and English regional language support.
2. **Screen 2 — Role Selection**: Shows Farmer, Worker, and Group Leader persona cards.
3. **Screen 3 — Farmer Dashboard**: Demonstrates instant farm job creation (crop type, wage, required worker count).
4. **Screen 4 — Live Map Discovery & GPS Navigation**: Shows real-time worker tracking and Google Maps directions to farm.
5. **Screen 5 — QR Code Attendance**: Demonstrates contactless check-in/check-out with 100m geofence validation.
6. **Screen 6 — Daily Wage & Earnings History**: Displays digital payment status and worker PDF earnings statements.

### ⚡ 15-Minute Fast Capture Guide using ADB (Android Emulator / Device)

When running the app on an Android emulator or connected device (`adb devices`), capture each screen with one command:

```bash
# Create directory
mkdir -p mobile/store/screenshots

# 1. Navigate to Splash/Language screen -> Capture
adb exec-out screencap -p > mobile/store/screenshots/01_splash_language.png

# 2. Navigate to Role Selection screen -> Capture
adb exec-out screencap -p > mobile/store/screenshots/02_role_selection.png

# 3. Navigate to Farmer Home & Job Create -> Capture
adb exec-out screencap -p > mobile/store/screenshots/03_farmer_dashboard.png

# 4. Navigate to Live Map screen -> Capture
adb exec-out screencap -p > mobile/store/screenshots/04_live_map_navigation.png

# 5. Navigate to Attendance QR Scanner -> Capture
adb exec-out screencap -p > mobile/store/screenshots/05_qr_attendance.png

# 6. Navigate to Worker Earnings / Payments -> Capture
adb exec-out screencap -p > mobile/store/screenshots/06_earnings_wallet.png
```
