# Screen 17 — Worker Home

## Overview
The main dashboard for the Worker. Allows them to toggle their "Online" status to receive job offers and provides a quick "Start Work" action.

**HTML Mock:** [worker-home.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/worker-home.html)
**Screen File:** [WorkerHomeScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/WorkerHomeScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Online Toggle** | Switch to set status to Online/Offline. |
| **Start Work Btn** | Massive button to initiate job search (Simulates Job Offer). |
| **Stats Pills** | Placeholders for Earnings and Help. |
| **Voice Voice** | "Pani start cheyyandi" (Start work) on mount. |

---

## Navigation Flow

```
Role Selection (Worker)
  → Screen 17 (Worker Home)
    → "Start Work"
      → Screen 18 (Job Offer) [Next]
```

---

## Files Modified

| File | Change |
|:--|:--|
| [WorkerHomeScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/WorkerHomeScreen.js) | **[NEW]** Created dashboard |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `WorkerHome` in `WorkerStack` |

---

## Backend Logic (Planned)

The Worker Home acts as the central hub for state and connectivity:

1.  **Online/Offline Toggle:**
    *   **API:** `POST /api/worker/status`
    *   **Payload:** `{ isOnline: boolean, location: { lat, lng } }`
    *   **Effect:** Updates the worker's visibility in the geospatial index (Redis/PostGIS). Only "Online" workers are queried during Job Matching.
2.  **Dashboard Data:**
    *   **API:** `GET /api/worker/dashboard`
    *   **Response:** `{ todaysEarnings: number, currentJobId: string | null }`
    *   **Logic:** Checks if there's an active job session to auto-redirect.
3.  **Socket Connection:**
    *   On mount, establishes a socket connection to listen for `job:new-offer` events targeted at their geohash.
