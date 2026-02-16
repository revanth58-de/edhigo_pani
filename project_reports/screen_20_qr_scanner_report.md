# Screen 20 — QR Scanner

## Overview
Allows the worker to scan the Farmer's QR code (generated in Screen 12) to clock in. Features a flashlight toggle, camera overlay, and simplified simulation mode.

**HTML Mock:** [qr-scan-attendance.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/qr-scan-attendance.html)
**Screen File:** [QRScannerScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/QRScannerScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Scanner Box** | Green-bordered overlay to focus the code. |
| **Flashlight** | Toggle to enable torch for low-light scans. |
| **Voice Voice** | "Point camera at QR code" instruction. |
| **Simulate Btn** | Dev-only button to simulate a successful scan. |

---

## Navigation Flow

```
Screen 19 (Navigation)
  → "I AM HERE"
    → Screen 20 (QR Scanner)     ← THIS SCREEN
      → Scan Success
        → Screen 21 (Attendance Confirmed) [Next]
```

---

## Files Modified

| File | Change |
|:--|:--|
| [QRScannerScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/QRScannerScreen.js) | **[NEW]** Created Scanner UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `QRScanner` route |
| [NavigationScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/NavigationScreen.js) | Wired up to navigate here |

---

## Backend Logic (Planned)

The QR scan triggers a secure attendance marking process:

1.  **API Call:** `POST /api/attendance/clock-in`
    *   **Payload:** `{ jobId: <scanned_qr_data>, workerId: <current_user_id>, location: <gps_coords> }`
2.  **Validation:**
    *   Verifies the `jobId` corresponds to an active job.
    *   Checks if the worker is within the geofence of the farm (optional security layer).
3.  **Database Update:**
    *   Creates a new `Attendance` record with `clockInTime`.
    *   Updates `JobWorker` status to `working`.
4.  **Real-time Notification:**
    *   Emits `attendance:worker_arrived` via Socket.io to the Farmer's device, triggering the **Arrival Alert** (Screen 11).

## Open Questions

1.  **Geofence Strictness:** Should we block attendance if the worker scans the QR code but their GPS shows them far away (e.g., scanning a photo of the code)?
2.  **Offline Support:** How should we handle attendance if the worker has no internet connection at the farm? (Store locally and sync later vs. require connection).
3.  **Late Arrivals:** Is there a penalty or logic needed if a worker arrives significantly later than the job start time?
