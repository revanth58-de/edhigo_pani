# Screen 12 — QR Attendance IN

## Overview
Allows the farmer to scan the worker's QR code to mark their attendance (clock-in). Features a full-screen camera view with a scanning overlay, flashlight toggle, and manual simulation for testing.

**HTML Mock:** [qr-scan-attendance.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/qr-scan-attendance.html)
**Screen File:** [QRAttendanceINScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/farmer/QRAttendanceINScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Camera View** | Full-screen back camera feed |
| **Dark Overlay** | Semi-transparent black overlay with a transparent square cutout for scanning |
| **Corner Markers** | 4 green corners (`L` shapes) defining the scan area |
| **Voice Card** | "Automatic Voice Active" — "Please scan worker QR code" |
| **Flashlight** | Toggle button for low-light conditions |
| **Simulate Scan** | **Manual Override Button** for simulators/emulators (Simulates a valid QR scan) |

---

## Navigation Flow

```
Screen 11 (Arrival Alert)
  → "SCAN ATTENDANCE (IN)" Button
    → Screen 12 (QR Attendance IN)     ← THIS SCREEN
      → Scan Success
        → Screen 13 (Work In Progress)  [placeholder]
```

---

## Testing Instructions

1.  **On Simulator:** Camera will likely show black screen. Use the **"Simulate Scan"** button to proceed.
2.  **On Device:**
    - Grant Camera permission.
    - Point at any QR code (or use the Simulate button).
    - App will vibrate/alert and navigate to Screen 13.

## Files Modified

| File | Change |
|:--|:--|
| [QRAttendanceINScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/farmer/QRAttendanceINScreen.js) | **[NEW]** Camera integration & UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Added route + WorkInProgress placeholder |
| [metro.config.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/metro.config.js) | Updated for expo-camera bundler support |
