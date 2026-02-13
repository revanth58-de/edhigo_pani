# 🗺️ FarmConnect — Sitemap

## 1. Authentication (All Users)
- **Splash Screen** `(Screens/Auth/SplashScreen.js)`
  - ↳ **Language Selection** `(Screens/Auth/LanguageScreen.js)`
    - ↳ **Login (Phone)** `(Screens/Auth/LoginScreen.js)`
      - ↳ **OTP Verification** `(Screens/Auth/OTPScreen.js)`
        - ↳ **Role Selection** `(Screens/Auth/RoleSelectionScreen.js)`
          - ➡️ *Redirects to specific role home*

## 2. Farmer Flow 🧑‍🌾
- **Farmer Home** `(Screens/Farmer/FarmerHomeScreen.js)`
  - ↳ **Work Type Selection** (Sowing/Harvesting/etc)
    - ↳ **Select Workers** `(Screens/Farmer/SelectWorkersScreen.js)`
      - ↳ **Request Sent** (Radar UI) `(Screens/Farmer/RequestSentScreen.js)`
        - ↳ **Request Accepted** (Live Map) `(Screens/Farmer/RequestAcceptedScreen.js)`
          - ↳ **Arrival Alert** `(Screens/Farmer/ArrivalAlertScreen.js)`
            - ↳ **QR Attendance IN** `(Screens/Farmer/QRAttendanceINScreen.js)`
              - ↳ **Work In Progress** (Timer) `(Screens/Farmer/WorkInProgressScreen.js)`
                - ↳ **QR Attendance OUT** `(Screens/Farmer/QRAttendanceOUTScreen.js)`
                  - ↳ **Payment** `(Screens/Farmer/PaymentScreen.js)`
                    - ↳ **Rate Worker** `(Screens/Farmer/RateWorkerScreen.js)`
- **Farmer Profile** `(Screens/Farmer/FarmerProfileScreen.js)`

## 3. Worker Flow 👷
- **Worker Home** `(Screens/Worker/WorkerHomeScreen.js)`
  - ↳ **Job Offer** (Popup) `(Screens/Worker/JobOfferScreen.js)`
    - ↳ **Navigation** (GPS Map) `(Screens/Worker/NavigationScreen.js)`
      - ↳ **QR Scanner** `(Screens/Worker/QRScannerScreen.js)`
        - ↳ **Attendance Confirmed** `(Screens/Worker/AttendanceConfirmedScreen.js)`
          - ↳ **Worker Status** (Working...) `(Screens/Worker/WorkerStatusScreen.js)`
            - ↳ **Rate Farmer** `(Screens/Worker/RateFarmerScreen.js)`
- **Worker Profile** `(Screens/Worker/WorkerProfileScreen.js)`

## 4. Group Leader Flow 👑
- **Leader Home** `(Screens/Leader/LeaderHomeScreen.js)`
  - ↳ **Start Group**
    - ↳ **Group Setup/QR** `(Screens/Leader/GroupSetupScreen.js)`
      - ↳ **Group QR Attendance** `(Screens/Leader/GroupQRScreen.js)`
        - ↳ **Group Confirmed** `(Screens/Leader/GroupConfirmedScreen.js)`
          - ↳ **Live Map & Call** `(Screens/Leader/LiveMapScreen.js)`
            - ↳ **Rate Farmer** `(Screens/Leader/RateFarmerScreen.js)`

## 5. Shared / Discovery
- **Live Map Discovery** `(Screens/Shared/LiveMapDiscoveryScreen.js)`
