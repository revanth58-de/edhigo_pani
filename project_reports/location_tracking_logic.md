# 📍 Real-Time Location Tracking Logic

This document explains how FarmConnect tracks users (Farmers, Workers, Leaders) in real-time.

---

## 1. High-Level Flow
1.  **Permission:** App asks for "Always Allow" location permission.
2.  **Capture:** Phone GPS captures coordinates (`lat`, `lng`).
3.  **Emit:** App sends coordinates to Server via **Socket.io** every 5-10 seconds.
4.  **Broadcast:** Server updates the database/cache and tells other relevant users (e.g., Farmer sees Worker's dot moving).

---

## 2. Frontend Implementation (React Native + Expo)

We use `expo-location` and `expo-task-manager` for reliable tracking, even when the app is backgrounded.

### A. Requesting Permissions
User must grant foreground and background permissions.

```javascript
import * as Location from 'expo-location';

const requestPermissions = async () => {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return;

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') return;
};
```

### B. Background Tracking Task
We define a global task that runs even if the app is minimized.

```javascript
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) return;
  if (data) {
    const { locations } = data;
    const { latitude, longitude } = locations[0].coords;

    // 🚀 Send to Server via Socket
    socket.emit('location:update', {
      latitude,
      longitude,
      timestamp: Date.now(),
    });
  }
});
```

### C. Starting the Tracker
When a Worker goes "Online" or accepts a job:

```javascript
await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000, // Update every 5 seconds
  distanceInterval: 10, // Or every 10 meters
  showsBackgroundLocationIndicator: true, // Blue bar on iOS
});
```

---

## 3. Backend Handling (Radio Tower)

The server acts as a switchboard. It receives the ping and decides who needs to see it.

### Socket Event Listener
```javascript
// backend/socker.js

socket.on('location:update', async (data) => {
  const { latitude, longitude } = data;
  const workerId = socket.userId;

  // 1. Update Database / Redis Cache (Fast)
  await redis.geoadd('workers_geo', longitude, latitude, workerId);
  
  // 2. Find who is watching this worker
  // Example: If worker is in active job #123
  const activeJobId = await getActiveJob(workerId);
  if (activeJobId) {
    // 3. Broadcast to the Farmer of that job
    socket.to(`room:job:${activeJobId}`).emit('worker:moved', {
      workerId,
      latitude,
      longitude
    });
  }
});
```

---

## 4. Battery Optimization 🔋
To prevent draining the user's battery:
1.  **Smart Intervals:** Only track when `status === 'working'` or `status === 'en_route'`.
2.  **Stop on Idle:** Automatically `stopLocationUpdatesAsync` when the job is done.
3.  **Distance Filter:** Don't send update if user moved < 10 meters.
