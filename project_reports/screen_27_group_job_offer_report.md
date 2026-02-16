# Screen 27 — Group Job Offer

## Overview
A critical decision point where the Group Leader reviews an incoming job offer that matches their group's size. Displays key details like "Need 15 Workers" and distance.

**HTML Mock:** [job-offer-group.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/job-offer-group.html)
**Screen File:** [GroupJobOfferScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/leader/GroupJobOfferScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Job Header** | Displays role (e.g., HARVESTING) and worker count required (e.g., "Need 15 Workers"). |
| **Stats Cards** | Distance (2.5 km) and Team Size (15 Total). |
| **Action Buttons** | Massive "Accept" (Green) and "Decline" (Grey) buttons. |
| **Voice Voice** | "Group job request nearby. 15 people required..." |

---

## Navigation Flow

```
Screen 26 (Group Setup)
  → "GO LIVE"
    → Screen 27 (Group Job Offer)     ← THIS SCREEN
      → Accept
        → Screen 28 (Group QR Scanner) [Next]
      → Decline
        → Screen 25 (Leader Home)
```

---

## Backend Logic (Planned)

Handles the complex transaction of booking an entire group:

1.  **Job Locking:**
    *   **API:** `POST /api/jobs/{jobId}/group-accept`
    *   **Payload:** `{ leaderId: <uuid>, sessionId: <uuid> }`
    *   **Concurrency:**
        *   Uses a `SELECT FOR UPDATE` on the `Jobs` table to lock the row.
        *   Verifies `Job.remainingSlots >= Group.memberCount` (Atomic Check).
    *   **Result:** If successful, sets `Job.status = 'FILLED'` and assigns all slots to this Group Session.
2.  **Notification:**
    *   **Socket:** Emits `job:filled` to the Farmer immediately.
3.  **Validation:**
    *   **Geofence:** Ensures the Leader is actually within the acceptable radius (if strict mode is on).

---

## Files Modified

| File | Change |
|:--|:--|
| [GroupJobOfferScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/leader/GroupJobOfferScreen.js) | **[NEW]** Created Group Offer UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `GroupJobOffer` route |
