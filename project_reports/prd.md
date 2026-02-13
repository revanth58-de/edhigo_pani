# 🌾 FarmConnect — Product Requirements Document (PRD)

## 1. Product Vision

**FarmConnect** (internally "Edhigo Pani") is a mobile-first marketplace that connects **farmers** who need agricultural labor with **workers** (individual or group) who provide it. The app is designed for rural India, with a **voice-first, low-literacy UI** supporting Telugu, Hindi, and English.

> [!IMPORTANT]
> The entire UX is built around the principle: **"If someone can't read, they can still use the app."** Every screen has voice guidance, oversized emoji/icon touch targets, and minimal text.

---

## 2. User Roles

| Role | Icon | Description |
|------|------|-------------|
| **Farmer** | 🚜 `agriculture` | Land owner who posts work requests (sowing, harvesting, etc.) |
| **Worker** | 🔧 `handyman` | Individual laborer who accepts and performs farm work |
| **Group Leader** | 👥 `groups` | Manages a team of workers, coordinates group attendance and assignments |

---

## 3. Core Feature Set

### 3.1 Onboarding & Authentication
| Feature | Details |
|---------|---------|
| Splash Screen | Logo (eco + handshake icons), loading spinner, voice prompt "App start avutondi" |
| Language Selection | Telugu, Hindi, English — massive card-style selectors |
| Phone Login | Custom large numeric keypad, no standard keyboard needed |
| OTP Verification | 4-digit code entry with custom keypad, resend option |
| Role Selection | Three large icon cards (Farmer/Worker/Group Leader) with Telugu labels |

### 3.2 Farmer Features
| Feature | Details |
|---------|---------|
| **Home Screen** | Work type grid: Sowing, Harvesting, Irrigation, Labour, Tractor — each with icon |
| **Profile** | Photo, name, phone, village, land (acres with +/- stepper), animals (Cow/Buffalo/Hen with counters) |
| **Select Workers** | Choose Individual or Group, set count (5/10/20/50 quick chips or +/- stepper) |
| **Request Sent** | Radar-style pulse animation, "Finding Workers…" with cancel option |
| **Request Accepted** | Live map showing worker en route, ETA, distance, worker count, pay rate, CALL button |
| **Arrival Alert** | Worker has arrived notification card with Accept/Reject actions |
| **QR Attendance IN** | Generate QR code for workers to scan, auto-refresh timer |
| **Work In Progress** | Live timer (HH:MM:SS), current location map, task type, area covered, FINISH WORK → QR OUT |
| **QR Attendance OUT** | Generate exit QR for workers to scan out |
| **Payment** | Cash vs UPI toggle, UPI QR code display, amount, DONE button |
| **Rate Worker** | Emoji rating (😊 Good / 😐 OK / ☹️ Bad) + 5-star detail, FINISH button |

### 3.3 Worker Features
| Feature | Details |
|---------|---------|
| **Home Screen** | "Namaste, [Name]" greeting, online status indicator, massive START WORK button, Help & Earnings quick actions |
| **Profile** | Skills grid (Plowing, Seeding, Harvesting, Pesticides), domestic animals (counters), voice guidance in Telugu |
| **Status Screen** | Three selectable cards: Ready to Work (Available), In Progress (Working), Taking a Break |
| **Job Offer** | Accept/Decline with farmer info, work type, pay rate, distance, star rating |
| **GPS Navigation** | Turn-by-turn directions to farmer, live map, ETA, distance, CALL FARMER button |
| **QR Camera Scanner** | Camera viewfinder with flashlight toggle, gallery option, scan farmer's QR for attendance |
| **Rate Farmer** | Emoji rating in Telugu: Chala Bagunnaru (😊) / Paravaledu (😐) / Bagoledu (☹️), HOME button |

### 3.4 Group Leader Features
| Feature | Details |
|---------|---------|
| **Home Screen** | Voice guidance waveform, massive START GROUP button with glow effect |
| **Group Setup** | QR code display for members to scan and join, member list with remove option |
| **Group QR Attendance** | Group QR code for collective check-in, member status indicators |
| **Group Attendance Confirmed** | Success screen showing all checked-in members |
| **Live Map & Call** | Map view of all group members, call/chat buttons |
| **Rate Farmer** | Same emoji rating from leader's perspective with Excellent/Good/Needs Help labels |

### 3.5 Cross-Cutting Features
| Feature | Details |
|---------|---------|
| **Voice Guidance** | Every screen has a 🔊 button; Telugu audio prompts play automatically |
| **Dark Mode** | Full dark theme support across all screens |
| **Live Map Discovery** | Map-based view showing nearby available workers/groups with filters |
| **Bottom Navigation** | Role-specific tabs (Home, Jobs/Tasks/History, Group, Profile) |
| **Notifications** | Bell icon with badge, job alerts, arrival alerts |

---

## 4. Design System

| Token | Value |
|-------|-------|
| **Primary Color** | `#5bec13` (Vibrant Lime Green) |
| **Background Light** | `#f6f8f6` |
| **Background Dark** | `#162210` |
| **Font** | Lexend (primary), Plus Jakarta Sans (alternate), Noto Sans (Indic scripts) |
| **Icons** | Material Symbols Outlined (filled variant) |
| **Border Radius** | Default `1rem`, Large `2rem`, XL `3rem`, Full `9999px` |
| **Min Touch Target** | 48×48px (most buttons are 64×64px or larger) |

---

## 5. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Offline Support** | QR codes, cached profile data, pending sync queue |
| **Low-Bandwidth** | Minimal data usage, compressed images, progressive loading |
| **Accessibility** | Voice-first, high-contrast, color-blind safe (green + white + black), oversized touch targets |
| **Multilingual** | Telugu (primary), Hindi, English — with transliteration |
| **Performance** | < 3s cold start, < 1s screen transitions |
| **GPS Accuracy** | 10m precision for navigation & attendance geo-fencing |
| **Security** | Phone-based auth, OTP verification, encrypted payments |

---

## 6. Success Metrics

| Metric | Target |
|--------|--------|
| User retention (7-day) | > 60% |
| Job completion rate | > 85% |
| Average rating score | > 4.0/5 |
| Voice guidance usage | > 70% of sessions |
| QR attendance adoption | > 90% of job sessions |
