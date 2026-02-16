# Screen 30 — Rate Farmer (Leader)

## Overview
The final step in the Group Leader's workflow. After the job involves finishing up, the Leader rates the Farmer. This action formally closes the Group Session and releases all workers back to the pool.

**HTML Mock:** [rate-farmer-leader.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/rate-farmer-leader.html)
**Screen File:** [RateFarmerLeaderScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/leader/RateFarmerLeaderScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Farmer Profile** | Photo and Name (e.g., Ramesh Kumar). |
| **Rating Faces** | Happy (Excellent), Neutral (Good), Sad (Needs Help). |
| **Finish Job Button** | Commits the rating and ends the session. |

---

## Navigation Flow

```
Screen 22 (Worker Status - Group Mode)
  → "FINISH JOB"
    → Screen 30 (Rate Farmer Leader)     ← THIS SCREEN
      → "FINISH JOB"
        → Screen 25 (Leader Home) [Reset]
```

---

## Backend Logic (Planned)

1.  **Session Closure:**
    *   **API:** `POST /api/groups/session/end`
    *   **Payload:** `{ sessionId: <uuid>, rating: 'HAPPY' | 'NEUTRAL' | 'SAD' }`
    *   **Effect:** Sets `Session.status = 'COMPLETED'`, `Job.status = 'COMPLETED'`.
2.  **Worker Release:**
    *   The system releases the `leaderId` lock on all associated workers, making them available for new individual or group jobs.
3.  **Payment Calculation:**
    *   Calculates the total payout based on `memberCount * rate`.

---

## Files Modified

| File | Change |
|:--|:--|
| [RateFarmerLeaderScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/leader/RateFarmerLeaderScreen.js) | **[NEW]** Created Leader Rating UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `RateFarmerLeader` route |
