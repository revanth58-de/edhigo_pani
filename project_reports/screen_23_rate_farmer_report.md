# Screen 23 — Rate Farmer

## Overview
Allows the worker to rate their experience with the Farmer after the job is completed. This feedback cycle ensures quality control on both sides of the marketplace.

**HTML Mock:** [rate-farmer-worker.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/rate-farmer-worker.html)
**Screen File:** [RateFarmerScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/RateFarmerScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Rating Grid** | **Happy** (Green), **Neutral** (Yellow), **Sad** (Red). |
| **Voice Voice** | "Farmer ela unnaru?" (How was the farmer?). |
| **Home Button** | Submits rating and returns to **Worker Home**. |

---

## Navigation Flow

```
Screen 22 (Worker status)
  → Finish Job
    → Screen 23 (Rate Farmer)     ← THIS SCREEN
      → "HOME"
        → Screen 17 (Worker Home) [Cycle Complete]
```

---

## Files Modified

| File | Change |
|:--|:--|
| [RateFarmerScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/RateFarmerScreen.js) | **[NEW]** Created Rating UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `RateFarmer` route |
| [WorkerStatusScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/WorkerStatusScreen.js) | Added "Finish Job" button |

---

## Backend Logic (Planned)

Closing the loop on the job cycle:

1.  **Submission:**
    *   **API:** `POST /api/reviews`
    *   **Payload:** `{ revieweeId: <farmerId>, jobId: <id>, rating: 'HAPPY' | 'NEUTRAL' | 'SAD' }`
    *   **Validation:** Can only be submitted once per job.
2.  **Reputation System:**
    *   **Calculation:** Updates the Farmer's aggregate trust score.
    *   **Impact:** Farmers with "Happy" ratings get priority when broadcasting new jobs.
3.  **Payment Unlock:**
    *   **Logic:** Submitting the rating is the final step that cleanly severs the active job session, unlocking the worker to receive new offers.
