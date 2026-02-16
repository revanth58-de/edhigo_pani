# Screen 26 — Group Setup

## Overview
Allows the Group Leader to configure the session: defining the number of workers and the payment method (Per Day or Per Acre) before broadcasting their availability to Farmers.

**HTML Mock:** [group-setup-leader.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/group-setup-leader.html)
**Screen File:** [GroupSetupScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/leader/GroupSetupScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Member Counter** | Plus/Minus controls to set the group size (e.g., 15 Members). |
| **Payment Type** | Radio cards for "**Per Day**" (Sun icon) vs "**Per Acre**" (Landscape icon). |
| **GO LIVE Button** | Final commitment action to make the group visible to Farmers. |
| **Voice Voice** | "How many workers?" (English) / Translation. |

---

## Navigation Flow

```
Screen 25 (Leader Home)
  → "START GROUP"
    → Screen 26 (Group Setup)     ← THIS SCREEN
      → "GO LIVE"
        → Screen 27 (Group Job Offer) [Wait State]
```

---

## Backend Logic (Planned)

Configures the parameters for the Job Matching engine:

1.  **Group Registration:**
    *   **API:** `POST /api/groups/session/configure`
    *   **Payload:**
        ```json
        {
          "sessionId": "uuid",
          "memberCount": 15,
          "preferredPaymentType": "PER_DAY", // or PER_ACRE
          "status": "LIVE"
        }
        ```
    *   **Effect:** The group is now "Bookable". The system will match this group against Job Offers that require `workerCount <= 15`.
2.  **Inventory Management:**
    *   **Logic:** The system treats the group as a single entity with `capacity = 15`.
3.  **Broadcasting:**
    *   **Socket:** Emits `group:available` to nearby Farmers looking for large teams.

---

## Files Modified

| File | Change |
|:--|:--|
| [GroupSetupScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/leader/GroupSetupScreen.js) | **[NEW]** Created Setup UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `GroupSetup` route |
