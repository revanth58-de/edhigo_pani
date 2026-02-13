# 🔔 Alert System Logic

This document details how FarmConnect ensures important updates (Job Offers, Emergency Alerts) reach the user reliably.

---

## 1. The 3-Tier Strategy

We use a "cascade" approach to ensure delivery.

1.  **Tier 1: In-App Toast** (Instant) → If user is *Online* and app is *Open*.
2.  **Tier 2: Push Notification** (Standard) → If user is *Backgrounded* or *Phone Locked*.
3.  **Tier 3: SMS Fallback** (Critical) → If *No Data / Offline* for > 15 mins (for urgent job matches only).

---

## 2. Implementation Details

### Tier 1: In-App Toasts (Socket.io)
**Library:** `react-native-toast-message`
**Trigger:** Socket event `job:new_offer` received while app is in foreground.

```javascript
// frontend/App.js
socket.on('job:new_offer', (data) => {
  Toast.show({
    type: 'success',
    text1: 'New Job Offer! 🚜',
    text2: `${data.workType} at ${data.distance}km`,
    onPress: () => navigate('JobDetail', { id: data.jobId })
  });
});
```

### Tier 2: Push Notifications (Expo)
**Service:** Expo Push Notification Service (EPNS)
**Requirement:** Store `pushToken` in `users` table during login.

**Backend Logic:**
```javascript
// backend/utils/notifications.js
const sendPush = async (tokens, title, body, data) => {
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  await axios.post('https://exp.host/--/api/v2/push/send', messages);
};
```

### Tier 3: SMS Fallback (Twilio)
**Trigger:** High-value event + User hasn't acknowledged Push in 5 mins.
**Service:** Twilio Programmable SMS

```javascript
// backend/jobs/sms_fallback.js
const sendSMS = async (phone, message) => {
  await client.messages.create({
    body: message,
    from: '+15550001234',
    to: phone
  });
};
```

---

## 3. Critical Alert Types

| Alert Type | Priority | Delivery Method | Sound |
| :--- | :--- | :--- | :--- |
| **New Job Offer** | High | Push + Sound | "Chime" |
| **Worker Arrived** | High | Push + TTS | "Voice" |
| **Shift Started** | Medium | Silent Push | None |
| **Payment Received** | High | Push + SMS | "Cash Register" |
| **Emergency** | Critical | Push (Critical Channel) | "Siren" |

---

## 4. User Preferences
Users can toggle alerts in Settings:
-   [x] Job Offers (Always On)
-   [ ] Marketing
-   [x] Payment Confirmations
