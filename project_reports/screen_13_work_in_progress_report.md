# Screen 13 — Work In Progress

## Overview
Monitors the active job session. Features a live HH:MM:SS timer, a pulsing "WORKING" status indicator, job details, and an "END DAY" button to clock out.

**HTML Mock:** [work-in-progress-farmer.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/work-in-progress-farmer.html)
**Screen File:** [WorkInProgressScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/farmer/WorkInProgressScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Live Timer** | HH:MM:SS format, increments every second |
| **Status Card** | "LIVE SESSION" with pulsing green dot notification |
| **Map Card** | Placeholder for live worker tracking |
| **Stats Row** | Task Type (e.g., Harvesting) and Worker Name |
| **Voice Voice** | "Work in progress" auto-spoken on mount |
| **End Day Button** | Large action button → "FINISH WORK" (leads to QR Out) |
| **Bottom Nav** | Standard layout: Home, Tasks, History, Profile |

---

## Navigation Flow

```
Screen 12 (QR Attendance IN)
  → Scan Success
    → Screen 13 (Work In Progress)     ← THIS SCREEN
      → "FINISH WORK" Button
        → Screen 14 (QR Attendance OUT) [placeholder]
```

---

## Files Modified

| File | Change |
|:--|:--|
| [WorkInProgressScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/farmer/WorkInProgressScreen.js) | **[NEW]** Full screen implementation |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Added `WorkInProgress` route to FarmerStack |

---

## Technical Details

- **Timer Logic:** `setInterval` runs every 1000ms. Code uses `useRef` for animation but state for timer.
- **Auto-Voice:** `speak('Work in progress')` called in `useEffect`.
- **Map:** Visual placeholder constructed with Views (grid lines + marker) to mimic a map until `react-native-maps` is fully integrated.
