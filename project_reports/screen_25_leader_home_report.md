# Screen 25 — Leader Home

## Overview
The landing page for the **Group Leader** role. It features a massive call-to-action button to "START GROUP", initiating the workflow for managing a group of workers.

**HTML Mock:** [leader-home-start-group.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/leader-home-start-group.html)
**Screen File:** [LeaderHomeScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/leader/LeaderHomeScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Start Group Button** | Massive pulsing green button. Triggers group setup flow. |
| **Voice Voice** | "Group pani start cheyyandi" (Start group work) on mount. |
| **Navigation** | Home, History, Profile tabs. |

---

## Navigation Flow

```
Role Selection (Group Leader)
  → Screen 25 (Leader Home)     ← THIS SCREEN
    → "START GROUP"
      → Screen 26 (Group Setup) [Next]
```

---

## Backend Logic (Planned)

The Leader Home is the entry point for Group Management:

1.  **Group Session Initialization:**
    *   **API:** `POST /api/groups/session/start`
    *   **Payload:** `{ leaderId: <uuid>, location: { lat, lng } }`
    *   **Response:** `{ sessionId: <uuid>, status: 'DRAFT' }`
    *   **Logic:** Creates a temporary session record. This session will eventually link multiple workers to a single JobID.
2.  **Leader Availability:**
    *   **Socket:** Emits `leader:online`.
    *   **Status:** Marks the Leader as "Active" in the geospatial index, but *not* yet available for jobs until the group is formed.
3.  **State Management:**
    *   **Local Store:** Clears any previous `groupMembers` array from local storage to ensure a fresh start.

---

## Files Modified

| File | Change |
|:--|:--|
| [LeaderHomeScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/leader/LeaderHomeScreen.js) | **[NEW]** Created Leader Dashboard |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `LeaderStack` and `LeaderHome` |
