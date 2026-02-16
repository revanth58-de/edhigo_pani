# Screen 18 — Job Offer

## Overview
A high-priority popup/screen that appears when the worker receives a job limit. Displays critical details (Role, Farmer Name, Location) and requires an explicit Accept or Reject action.

**HTML Mock:** [job-offer-detail.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/job-offer-detail.html)
**Screen File:** [JobOfferScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/JobOfferScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Role Header** | Large uppercase text (e.g., "HARVESTING"). |
| **Farmer Info** | Avatar, Name, and Location with distance. |
| **Voice Voice** | "New job offer available" on mount. |
| **Accept Button** | Massive Green Check button → Navigates to Navigation. |
| **Reject Button** | Massive Red Cancel button → Returns to Home. |

---

## Navigation Flow

```
Screen 17 (Worker Home)
  → "Simulate Job Offer"
    → Screen 18 (Job Offer)     ← THIS SCREEN
      → Accept
        → Screen 19 (Navigation) [Next]
      → Reject
        → Screen 17 (Worker Home)
```

---

## Files Modified

| File | Change |
|:--|:--|
| [JobOfferScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/JobOfferScreen.js) | **[NEW]** Created Job Offer UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `JobOffer` route |
| [WorkerHomeScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/WorkerHomeScreen.js) | Wired up simulation button |

---

## Backend Logic (Planned)

This screen is triggered by a real-time event, making speed and consistency critical:

1.  **Receiving Offer:**
    *   **Source:** Socket.io event `job:new-offer` received by `WorkerHomeScreen`.
    *   **Data:** `{ jobId, farmerName, location, rate, workType }`.
2.  **Accepting Job:**
    *   **API:** `POST /api/jobs/{jobId}/accept`
    *   **Concurrency:** Uses a database transaction (SELECT FOR UPDATE) to ensure only *one* worker can accept a specific slot.
    *   **Race Condition Handling:** If another worker accepts first, the API returns `409 Conflict`, and the app displays "Job no longer available".
3.  **Rejecting Job:**
    *   **Client-side:** Simply dismisses the modal.
    *   **Analytics:** Optionally sends a "pass" signal to improve future matching algorithms.
