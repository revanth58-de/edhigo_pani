# Implementation Plan - Screen 15: Rate Worker

## Goal
Implement the **Rate Worker** screen where the farmer rates the worker's performance after the job is finished.
- **Input:** Rating (Positive/Neutral/Negative).
- **Output:** Submission to backend (mocked for now) → Return to Home.

## Proposed Changes

### 1. New Screen: `RateWorkerScreen.js`
- **Location:** `mobile/src/screens/farmer/RateWorkerScreen.js`
- **Features:**
  - "How was the worker?" headline (Multilingual).
  - 3-Face Rating System:
    - 😊 Happy (Chala Bagunnaru)
    - 😐 Neutral (Paravaledu)
    - ☹️ Sad (Bagoledu)
  - "HOME" button to restart the flow.
  - Voice guidance: "Worker ela pani chesaru?" (How did the worker work?)

### 2. Navigation
- **File:** `mobile/src/navigation/AppNavigator.js`
- **Change:** Register `RateWorker` in `FarmerStack`.
- **Flow:** `QRAttendanceOUT` → `RateWorker` → `FarmerHome`.

## Verification Plan

### Manual Verification
1.  **Navigate:** QR Attendance OUT → Simulate Scan → **Rate Worker**.
2.  **UI Check:** Verify face icons and text.
3.  **Action:** Tap a rating face.
4.  **Result:** Selection should highlight.
5.  **Action:** Tap "HOME".
6.  **Result:** navigate to Farmer Home.

### Automated Tests
- None.
