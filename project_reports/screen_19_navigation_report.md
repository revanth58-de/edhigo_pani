# Screen 19 — Navigation

## Overview
Provides turn-by-turn navigation for the worker to reach the farm. Includes visual map cues, distance indicators, and voice guidance.

**HTML Mock:** [navigation-worker.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/navigation-worker.html)
**Screen File:** [NavigationScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/NavigationScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Turn Card** | "200m - Turn Right" instruction at top. |
| **Map View** | Visual placeholder for map trail. |
| **Voice Voice** | "Follow the green line" & "Turn right" prompts. |
| **I Am Here** | Action button to confirm arrival → Navigates to QR Scanner. |

---

## Navigation Flow

```
Screen 18 (Job Offer)
  → Accept
    → Screen 19 (Navigation)     ← THIS SCREEN
      → "I AM HERE"
        → Screen 20 (QR Scanner) [Next]
```

---

## Files Modified

| File | Change |
|:--|:--|
| [NavigationScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/NavigationScreen.js) | **[NEW]** Created Map UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `Navigation` route |
| [JobOfferScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/worker/JobOfferScreen.js) | Wired up "Accept" to navigate here |

---

## Backend Logic (Planned)

Navigation relies on location services and third-party routing APIs:

1.  **Route Calculation:**
    *   **API:** Mapbox Directions API or Google Routes API (Client-side or proxied via Backend).
    *   **Inputs:** `currentLocation` (Subscriber) -> `farmLocation` (Destination).
2.  **Live Tracking:**
    *   **Socket Emit:** `worker:location-update` sent every 30s.
    *   **Payload:** `{ jobId, lat, lng }`.
    *   **Purpose:** Allows the Farmer (Screen 13) to see the worker approaching in real-time.
3.  **Geofence Arrival:**
    *   **Logic:** When `< 50m` from destination, the "I AM HERE" button enables (or auto-triggers voice prompt "You have arrived").
