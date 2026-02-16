# Screen 22 — Worker Status

## Overview
The main dashboard for the Worker while a job is active. Allows them to toggle their status between "Working", "Break", and "Available". This status is visible to the Farmer.

**HTML Mock:** [worker-status.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/worker-status.html)
**Screen File:** [WorkerStatusScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/WorkerStatusScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Status Cards** | Toggles for **Available** (Green), **Working** (Red), **Break** (Yellow). |
| **Voice Voice** | "Meeru pani chestunnaru" (You are working). |
| **Active Indicator** | Visual border and badge to show current selection. |

---

## Navigation Flow

```
Screen 21 (Attendance Confirmed)
  → OK
    → Screen 22 (Worker Status)     ← THIS SCREEN
      → (Job Done)
        → Screen 23 (Rate Farmer) [Next]
```

---

## Files Modified

| File | Change |
|:--|:--|
| [WorkerStatusScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/WorkerStatusScreen.js) | **[NEW]** Created Status Dashboard |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `WorkerStatus` route |

---

## Backend Logic (Planned)

State management is key here to calculate precise payroll:

1.  **Status Updates:**
    *   **API:** `PATCH /api/jobs/{jobId}/worker-status`
    *   **Payload:** `{ status: 'WORKING' | 'BREAK' }`
    *   **Payroll:** "Break" time is deducted from the hourly calculation (if applicable).
2.  **Farmer Visibility:**
    *   **Socket:** Real-time updates pushed to the Farmer's "Work In Progress" screen.
    *   **Purpose:** Builds trust; Farmer knows if the worker is taking a break without having to walk to the field.
3.  **Geo-Fencing:**
    *   **Background Service:** Periodically checks if the worker is still within the farm radius while status is "Working".
    *   **Alert:** If location drifts >500m, an alert is sent to potentially auto-pause the job.
