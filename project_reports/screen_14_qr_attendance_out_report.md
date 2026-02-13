# Screen 14 — QR Attendance OUT

## Overview
The "Scan to Finish" screen. The farmer displays a QR code to the worker. The worker scans this code on their device to verify the job is complete and to receive payment details.

**HTML Mock:** [qr-display-attendance-out.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/qr-display-attendance-out.html)
**Screen File:** [QRAttendanceOUTScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/farmer/QRAttendanceOUTScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **QR Code** | Large unique QR code containing `jobId`, `workerId`, and `amount` |
| **Amount Card** | Shows calculated payment (e.g., ₹250) based on duration |
| **Voice Button** | "Play Voice Instructions" — speaks guidance in English/Telugu |
| **Simulate Button** | **[Dev Only]** "Simulate Worker Scan" to complete flow manually |
| **Translation** | "Work finished, please scan" / "Pani ayipoyindi, scan cheyandi" |

---

## Navigation Flow

```
Screen 13 (Work In Progress)
  → "FINISH WORK"
    → Screen 14 (QR Attendance OUT)     ← THIS SCREEN
      → Worker Scans (or Simulate Tap)
        → Home (FarmerHome) [Looping back for now]
```

---

## Files Modified

| File | Change |
|:--|:--|
| [QRAttendanceOUTScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/farmer/QRAttendanceOUTScreen.js) | **[NEW]** QR generation & voice logic |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Added `QRAttendanceOUT` route |
| [metro.config.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/metro.config.js) | Added `cjs` support for QR svg lib |

---

## Technical Details

- **QR Library:** `react-native-qrcode-svg`
- **Payment Logic:** Mock formula `Math.ceil(minutes * 0.83)` (approx ₹50/hr).
- **Payload:** JSON string `{"type":"attendance_out", "jobId":..., "amount":...}`
