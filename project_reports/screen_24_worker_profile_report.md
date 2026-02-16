# Screen 24 — Worker Profile

## Overview
Allows the worker to manage their professional profile, including specific skills (Plowing, Harvesting, etc.) and domestic animals they own (for asset tracking/verification).

**HTML Mock:** [worker-profile.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/worker-profile.html)
**Screen File:** [WorkerProfileScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/WorkerProfileScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Skills Grid** | Toggle buttons for **Plowing**, **Seeding**, **Harvesting**, **Pesticides**. |
| **Animal Counters** | Increment/Decrement counters for **Cow**, **Buffalo**, **Hen**. |
| **Voice Voice** | "Mee details fill cheyyandi" (Fill your details). |
| **Save Button** | Persists changes to the profile. |

---

## Navigation Flow

```
Any Worker Screen
  → Bottom Nav "Profile"
    → Screen 24 (Worker Profile)     ← THIS SCREEN
      → Back / Home
        → Screen 17 (Worker Home)
```

---

## Files Modified

| File | Change |
|:--|:--|
| [WorkerProfileScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/WorkerProfileScreen.js) | **[NEW]** Created Profile UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `WorkerProfile` route |
| [WorkerHomeScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/WorkerHomeScreen.js) | Linked Profile tab |
| [WorkerStatusScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/WorkerStatusScreen.js) | Linked Profile tab |
| [RateFarmerScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/RateFarmerScreen.js) | Linked Profile tab |

---

## Backend Logic (Planned)

Manages the worker's digital identity and asset portfolio:

1.  **Profile Management:**
    *   **API:** `get` / `put` `/api/worker/profile`
    *   **Data Models:** `WorkerSkills` (normalized table), `WorkerAssets` (JSONB for animal counts).
2.  **Skill Verification:**
    *   **Future:** Self-reported skills (e.g., "Plowing") act as tags. Over time, these are verified by Farmer ratings for specific job types.
3.  **Matching Algorithm:**
    *   **Logic:** Jobs requiring "Plowing" will query workers who have this skill toggled ON in this profile screen.
4.  **Asset Tracking:**
    *   **Purpose:** "Cow" or "Buffalo" counts may qualify workers for specific livestock-related contracts or subsidies.
