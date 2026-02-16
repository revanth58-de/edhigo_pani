# Screen 31 — Live Map Discovery

## Overview
The central "Explore" experience for Farmers. It shows a real-time, geospatial view of available individual Workers (Blue dots) and Worker Groups (Purple clusters). It allows the Farmer to initiate a job request directly from the map.

**HTML Mock:** [live-map-discovery.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/live-map-discovery.html)
**Screen File:** [LiveMapDiscoveryScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/shared/LiveMapDiscoveryScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Map View** | Full-screen map (Google/Mapbox) showing user location and nearby workers. |
| **Markers** | **Blue Dots:** Individual Workers. **Purple Clusters:** Groups (with count, e.g., "15"). |
| **Discovery Card** | Bottom sheet showing summary (e.g., "12 Workers nearby"). |
| **Actions** | "SEND REQUEST" (Green) and "Call" (Greyed out initially). |
| **Search** | Floating search bar for locations. |

---

## Navigation Flow

```
Farmer Home / Leader Home
  → "Explore" / Map Icon
    → Screen 31 (Live Map Discovery)     ← THIS SCREEN
      → "SEND REQUEST"
        → Screen 08 (Select Workers) [Pre-filled]
      → "Call"
        → Screen 32 (Live Map Call) [Next]
```

---

## Backend Logic (Planned)

1.  **Geospatial Search:**
    *   **API:** `GET /api/workers/nearby?lat=...&lng=...&radius=5km`
    *   **Database:** Uses PostGIS `ST_DWithin` or Redis `GEORADIUS`.
    *   **Response:** List of workers/groups with coordinates and status.
2.  **Real-Time Updates:**
    *   **Socket:** Listens for `worker:location` events to animate markers moving in real-time.
3.  **Clustering:**
    *   **Logic:** If multiple workers are within a small delta, or if a Leader is online with a Group Session, show a Cluster Marker (Purple).
4.  **Privacy:**
    *   **Fuzzing:** Worker locations slightly randomized to protect exact home addresses when idle. Live tracking only enabled during "Available" or "En Route" states.

---

## Files Modified

| File | Change |
|:--|:--|
| [LiveMapDiscoveryScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/shared/LiveMapDiscoveryScreen.js) | **[NEW]** Created Map UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `LiveMapDiscovery` route |
