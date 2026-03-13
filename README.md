# FarmConnect (edhigo_pani) 🌾

A full-stack mobile platform that directly connects **Farmers**, **Workers**, and **Group Leaders** for agricultural job management. FarmConnect digitizes the entire workflow — from job posting & discovery, real-time notifications, QR-based attendance, payments, to ratings — all in one place.

---

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Mobile Setup](#mobile-setup)
- [Development Scripts](#development-scripts)
- [API Overview](#api-overview)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### 👨‍🌾 Farmer
- Post jobs and specify the number of workers needed
- Browse and select individual workers or groups
- Generate QR codes for worker check-in / check-out attendance
- Track work in progress in real-time
- Process payments with automatic breakdowns
- Rate workers after job completion

### 👷 Worker
- Browse and accept available job offers
- Navigate to farm location via integrated maps
- Scan QR codes to check in and check out
- View work history and earnings
- Rate farmers after job completion

### 👑 Group Leader
- Create and manage a group of workers
- Accept group jobs on behalf of all members
- Manage group QR attendance for the entire team
- View group-level job history and ratings

### 🌐 Shared
- Real-time notifications via **Socket.IO**
- Live map discovery to find workers and farmers nearby
- Multi-language support with voice guidance
- Phone-based OTP authentication

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express v5** | REST API server |
| **Prisma ORM** | Database management |
| **Socket.IO** | Real-time events & notifications |
| **JWT + bcryptjs** | Authentication & security |
| **Multer** | File/image uploads |
| **QRCode** | QR code generation |
| **Winston** | Logging |
| **Helmet + express-rate-limit** | Security hardening |
| **Expo Server SDK** | Push notifications |

### Mobile
| Technology | Purpose |
|---|---|
| **React Native + Expo** | Cross-platform mobile app |
| **React Navigation** | Screen navigation |
| **Zustand** | State management |
| **Axios** | HTTP API requests |
| **Socket.IO Client** | Real-time communication |
| **Expo Camera + jsQR** | QR code scanning |
| **Expo Notifications** | Push notifications |
| **Expo Location** | GPS/location services |
| **React Native Maps** | Map display |
| **Expo Secure Store** | Secure token storage |

---

## 📁 Project Structure

```
edhigo_pani/
├── backend/              # Node.js + Express API server
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── middleware/   # Auth & security middleware
│   │   └── server.js     # App entry point
│   └── prisma/           # Database schema & migrations
│
├── mobile/               # React Native (Expo) app
│   ├── src/
│   │   ├── screens/      # All app screens (auth, farmer, worker, leader)
│   │   ├── components/   # Reusable UI components
│   │   ├── services/api/ # API service functions
│   │   ├── navigation/   # App navigator (AppNavigator.js)
│   │   └── config/       # API config (api.config.js)
│   └── index.js          # App entry point
│
├── admin/                # Admin panel
├── frontend/             # Web frontend
├── TESTING_GUIDE.md      # Full QA testing checklist
└── QUICK_FIX.md          # Firewall & connectivity troubleshooting
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ and **npm**
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go** app on your iOS or Android device
- A configured database (see Prisma setup)

---

### Backend Setup

1. **Navigate to the backend directory:**
   ```sh
   cd backend
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Create your environment file:**
   ```sh
   cp .env.example .env
   ```
   Then fill in the required values in `.env`:
   ```env
   DATABASE_URL="your_database_connection_string"
   JWT_SECRET="your_super_secret_jwt_key"
   PORT=5000
   ```

4. **Set up the database with Prisma:**
   ```sh
   npm run db:generate
   npm run db:push
   ```

5. **Start the backend server:**
   ```sh
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```
   The server will start on `http://localhost:5000`. You should see:
   > `🚀 FarmConnect server running on port 5000`

---

### Mobile Setup

1. **Navigate to the mobile directory:**
   ```sh
   cd mobile
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure the API endpoint:**
   Open `src/config/api.config.js` and set the correct backend URL for your environment.

   > **On the same Wi-Fi network?** Use your local machine's IP address (e.g., `http://192.168.x.x:5000`).
   > **Having firewall issues?** See [Troubleshooting](#troubleshooting) or `QUICK_FIX.md`.

4. **Start the Expo development server:**
   ```sh
   # Standard mode
   npx expo start

   # Tunnel mode (recommended for iPhone over firewall)
   npx expo start --tunnel
   ```

5. **Run on device:**
   - **iPhone/Android**: Scan the QR code shown in the terminal with the **Expo Go** app.
   - **Android Emulator**: Press `a` in the terminal.
   - **iOS Simulator**: Press `i` in the terminal (macOS only).

---

## 📜 Development Scripts

### Backend (`/backend`)
| Command | Description |
|---|---|
| `npm run dev` | Start server with auto-reload (Node.js `--watch`) |
| `npm start` | Start server in production mode |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to the database |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm test` | Run Jest test suite |

### Mobile (`/mobile`)
| Command | Description |
|---|---|
| `npx expo start` | Start Expo development server |
| `npx expo start --android` | Launch on Android emulator |
| `npx expo start --ios` | Launch on iOS simulator |
| `npx expo start --tunnel` | Start with ngrok tunnel (bypasses firewall) |
| `npx expo start --clear` | Start with cleared cache |

---

## 🔌 API Overview

The backend runs on `http://localhost:5000`. Key endpoints:

| Endpoint | Description |
|---|---|
| `POST /api/auth/send-otp` | Send OTP to phone number |
| `POST /api/auth/verify-otp` | Verify OTP and issue JWT token |
| `POST /api/auth/set-role` | Set user role (farmer/worker/leader) |
| `PUT  /api/auth/profile` | Update user profile |
| `GET  /api/jobs` | List available jobs |
| `POST /api/jobs/:id/accept` | Accept a job offer |
| `POST /api/attendance/check-in` | Record QR check-in |
| `POST /api/attendance/check-out` | Record QR check-out |
| `POST /api/ratings` | Submit a rating |
| `GET  /health` | Server health check |

---

## 🧪 Testing

A complete testing guide covering all **32 screens** is available:

📄 **[TESTING_GUIDE.md](./TESTING_GUIDE.md)**

**Quick health check** (PowerShell):
```powershell
# Verify backend is running
Invoke-RestMethod -Uri "http://localhost:5000/health"

# Test OTP flow
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/send-otp" `
  -Method POST `
  -Body (@{phone="+919876543210"} | ConvertTo-Json) `
  -ContentType "application/json"
```

**Run backend unit tests:**
```sh
cd backend && npm test
```

---

## 🔧 Troubleshooting

### Expo can't connect to backend (Network Error)
This is commonly caused by a Windows Firewall blocking connections from your phone.

**Quick fix:** See **[QUICK_FIX.md](./QUICK_FIX.md)** for step-by-step firewall options.

**Or**, start Expo in tunnel mode which routes traffic through ngrok:
```sh
npx expo start --tunnel
```

### App crashes or blank screen
```sh
# Clear Expo cache and restart
npx expo start --clear
```

### Database issues
```sh
# Re-sync Prisma schema with the database
cd backend
npm run db:push
```

### Common errors

| Error | Fix |
|---|---|
| `Network Error` on API calls | Check backend is running; check API URL in `api.config.js` |
| `Unable to resolve module` | Run `npm install` in the relevant directory |
| Navigation action not handled | Verify screen is registered in `AppNavigator.js` |
| `500 Internal Server Error` | Check backend terminal for stack trace |

---

## 📄 License

ISC — see [LICENSE](./LICENSE) for details.

---

*Built with ❤️ to empower the agricultural community.*
