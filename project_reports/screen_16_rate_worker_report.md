# Screen 15 — Rate Worker

## Overview
The final step in the Farmer's core flow. Allows the farmer to rate the worker's performance using a simple, high-affordance 3-face interface.

**HTML Mock:** [rate-farmer-worker.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/rate-farmer-worker.html) (Adapted)
**Screen File:** [RateWorkerScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/farmer/RateWorkerScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Rating Faces** | 😊 Happy (Chala Bagunnaru), 😐 Neutral (Paravaledu), ☹️ Sad (Bagoledu) |
| **Headline** | "Worker ela pani chesaru?" (How was the worker?) |
| **Home Button** | Large "HOME" button to reset the flow (Disabled until rating selected) |
| **Voice Voice** | Auto-speaks "How was the worker?" on mount |

---

## Navigation Flow

```
Screen 14 (QR Attendance OUT)
  → Worker Scans
    → Screen 15 (Rate Worker)     ← THIS SCREEN
      → Select Rating
        → Tap "HOME"
          → Screen 6 (Farmer Home) [Flow Complete]
```

---

## Files Modified

| File | Change |
|:--|:--|
| [RateWorkerScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/farmer/RateWorkerScreen.js) | **[NEW]** Rating logic & UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Added `RateWorker` route |

---

## Technical Details

- **State:** `rating` ('happy' | 'neutral' | 'sad')
- **Validation:** "HOME" button is disabled/greyed out until a rating is selected.
- **Voice:** Uses `speak()` utility for accessibility.
