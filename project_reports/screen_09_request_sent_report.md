# ✅ Screen 9 Report: Request Sent

**Mock source:** `frontend/request-sent.html` (formerly `code24.html`)
**Implementation:** `mobile/src/screens/farmer/RequestSentScreen.js`

## What Was Built

-   **Radar Animation:** Pulsing concentric circles using `Animated` API to indicate "Searching".
-   **Backend Integration:**
    -   **API:** `POST /api/jobs`
    -   **Controller:** Created `jobs.controller.js` with `createJob` method.
    -   **Route:** Created `jobs.routes.js` and registered in `server.js`.
-   **Simulation:**
    -   Since we don't have a live worker app responding yet, the screen simulates a match after 3 seconds.
    -   Navigates to `RequestAccepted` (Screen 10) passing the created job object.

## Backend Interaction

-   **Endpoint:** `POST /api/jobs`
-   **Payload:**
    ```json
    {
      "workType": "Harvesting",
      "workerType": "individual",
      "workersNeeded": 1,
      "payPerDay": 500,
      "farmLatitude": 17.385,
      "farmLongitude": 78.486
    }
    ```
-   **Response:** Returns created job object with `id` and status `pending`.
-   **Socket:** Emits `job:new-offer` to connected clients (e.g. Workers).

## Next Up: Screen 10 — Request Accepted
(Shows the worker who accepted the job and their live location on a map).
