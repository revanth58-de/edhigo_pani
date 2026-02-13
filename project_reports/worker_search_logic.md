# 🔍 Worker Searching Logic

This document details the complete logic for how the FarmConnect app finds and matches workers with farmers.

---

## 1. High-Level Concept
When a Farmer posts a job (e.g., "Need 5 people for Harvesting"), the system performs a **Real-Time Spatial Search**. It's like a ride-sharing app finding the nearest available drivers, but for farm labor.

### The 3-Step Funnel
1.  **Filter**: Who is a *Worker*, *Available* right now, and has the right *Skills*?
2.  **Locate**: Who is within the *5km Radius* of the farm?
3.  **Rank**: Sort them by *Distance* (closest first) and *Rating* (highest first).

---

## 2. Detailed Algorithm

### Step 1: The Trigger
**Actor:** Farmer
**Action:** Clicks "Request Workers"
**Payload Sent:**
```json
{
  "workType": "harvesting",
  "workerCount": 5,
  "farmLocation": { "lat": 17.385, "lng": 78.486 }
}
```

### Step 2: The Database Query (Spatial Filter)
We use the **Haversine Formula** (or PostGIS) to find workers within range ($d \le 10km$).

**Criteria:**
-   `role` == `'worker'`
-   `status` == `'available'` (Not currently working or offline)
-   `distance` <= `10 km` (Configurable)

**Pseudocode (SQL/Prisma):**
```sql
SELECT id, name, phone, latitude, longitude,
       ( 6371 * acos( cos( radians(17.385) ) * cos( radians( latitude ) ) 
       * cos( radians( longitude ) - radians(78.486) ) + sin( radians(17.385) ) 
       * sin( radians( latitude ) ) ) ) AS distance
FROM users
WHERE role = 'worker' 
  AND status = 'available'
HAVING distance < 10
ORDER BY distance ASC, ratingAvg DESC
LIMIT 50;
```

### Step 3: Notification (Socket.io)
Once the list of matching workers is found, the server sends a **Push Notification / Socket Event** to them.

-   **Event:** `job:new_offer`
-   **Recipient:** Each `socketId` mapped to the matching `workerId`s.
-   **Payload:**
    ```json
    {
      "jobId": "xyz-123",
      "workType": "Harvesting",
      "pay": "₹500/day",
      "distance": "2.1 km",
      "farmerName": "Ramesh"
    }
    ```

### Step 4: Acceptance (First-Come-First-Served)
-   The first 5 workers to click **"Accept"** get the job.
-   **Concurrency Handle:** Data lock ensures we don't accept 6 workers if 5 are needed.
    ```javascript
    // Atomic check
    if (job.filledPositions < job.totalPositions) {
       job.filledPositions++;
       assignWorker(workerId);
    } else {
       sendError("Job filled");
    }
    ```

---

## 3. Implementation Plan (Backend)

We will implement this in `jobs.controller.js` using Prisma.

```javascript
/* backend/src/controllers/jobs.controller.js */

const findNearbyWorkers = async (lat, lng, radiusKm = 10) => {
  // Use Prisma raw query for Haversine distance
  const workers = await prisma.$queryRaw`
    SELECT id, pushToken, 
    ( 6371 * acos( cos( radians(${lat}) ) * cos( radians( latitude ) ) 
    * cos( radians( longitude ) - radians(${lng}) ) + sin( radians(${lat}) ) 
    * sin( radians( latitude ) ) ) ) AS distance
    FROM users
    WHERE role = 'worker' AND status = 'available'
    HAVING distance < ${radiusKm}
    ORDER BY distance ASC
  `;
  return workers;
};
```

## 4. Edge Cases Handled
1.  **No Workers Found:** Expand radius automatically (10km -> 20km) or notify Farmer to try later.
2.  **Worker Goes Offline:** If a worker accepts but loses internet, the system waits 5 mins before re-opening the slot.
3.  **Race Condition:** 10 people accept simultaneously for 1 spot. The database transaction ensures strict ordering.
