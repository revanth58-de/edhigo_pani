# Screen 32 — Live Map Call

## Overview
A dedicated screen for handling voice calls between Farmers and Leaders/Workers. It launches directly from the "Call" action on the Live Map or Job Details screens. It provides context about the other party (distance, name) and call controls.

**HTML Mock:** [live-map-call-leader.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/live-map-call-leader.html)
**Screen File:** [LiveMapCallScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/shared/LiveMapCallScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Caller Profile** | Photo, Name, and realtime distance/ETA (e.g., "1.2 km away • 15 mins"). |
| **Map Background** | Visual context showing the route or location of the caller. |
| **Call Controls** | Mute, Speaker, and a large "End Call" button. |
| **Status** | "Connecting...", "Connected 00:15", etc. |

---

## Navigation Flow

```
Screen 31 (Live Map Discovery) / Job Details
  → "Call" Button
    → Screen 32 (Live Map Call)     ← THIS SCREEN
      → "End Call"
        → Returns to previous screen
```

---

## Backend Logic (Planned)

1.  **Signaling Server:**
    *   **Socket.IO:** Exchanges SDP offers/answers and ICE candidates between peers.
    *   **Events:** `call:invite`, `call:accept`, `call:ice-candidate`, `call:end`.
2.  **Voice Provider:**
    *   **WebRTC:** Direct P2P connection for audio.
    *   **Fallback:** Twilio Voice or Agora (if P2P fails behind NATs).
3.  **Privacy:**
    *   Real phone numbers are **masked**. Use an in-app ID or VOIP to protect user privacy.

---

## Files Modified

| File | Change |
|:--|:--|
| [LiveMapCallScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/shared/LiveMapCallScreen.js) | **[NEW]** Created Call UI |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Registered `LiveMapCall` route |
