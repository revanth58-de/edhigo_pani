# Screen 28 — Group QR Scanner

## Overview
Unlike the individual Worker flow where the worker scans the Farmer's QR code, in the Group flow, the **Leader displays a QR code** (or scans the Farmer's, depending on the specific on-site protocol, but the mock suggests "Show this QR code").

*Correction based on HTML Mock:* The mock `group-qr-attendance-in.html` shows a massive QR code with the text "**15 WORKERS**" and instruction "**Show this QR code**". This means the **Farmer scans the Leader's QR** to check in the whole group at once.

**HTML Mock:** [group-qr-attendance-in.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/group-qr-attendance-in.html)
**Screen File:** [GroupQRAttendanceScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/leader/GroupQRAttendanceScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **QR Code** | Large, central QR code generated for the specific Job/Session. |
| **Badge** | "15 WORKERS" badge to confirm group size. |
| **Instruction** | "Ee QR code chupinchandi" (Show this QR code). |

---

## Navigation Flow

```
Screen 27 (Group Job Offer)
  → "ACCEPT"
    → Screen 28 (Group QR Attendance)     ← THIS SCREEN
      → (Farmer Scans)
        → Screen 29 (Group Attendance Confirmed) [Auto-Nav]
```

---

## Backend Logic (Planned)

The Group Check-in process reverses the individual flow to speed up large group entry:

1.  **QR Generation:**
    *   **Data:** `JSON.stringify({ type: 'GROUP_CHECKIN', sessionId: <uuid>, count: 15, leaderId: <uuid> })`
    *   **Encryption:** The string is signed with a temporary secret to prevent spoofing.
2.  **Socket Listener:**
    *   The Leader's app listens for `session:status_update`.
3.  **Farmer Action:**
    *   Farmer scans this QR.
    *   Backend validates the session and updates `Job.attendanceCount += 15`.
    *   Backend emits `session:status_update` -> `{ status: 'WORKING' }`.
4.  **Auto-Navigation:**
    *   Upon receiving the socket event, the Leader's app automatically navigates to **Screen 29**.

---

## Files Modified

| File | Change |
|:--|:--|
| [GroupQRAttendanceScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/leader/GroupQRAttendanceScreen.js) | **[NEW]** Created Group QR Display UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `GroupQRAttendance` route |
