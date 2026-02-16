# Screen 15 — Payment

## Overview
Allows the farmer to pay the worker after the job is completed. Features a toggle between Cash and UPI, displays the total amount, and provides a "PAID" confirmation action.

**HTML Mock:** [payment-farmer.html](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/frontend/payment-farmer.html)
**Screen File:** [PaymentScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/farmer/PaymentScreen.js)

---

## UI Components

| Component | Description |
|:--|:--|
| **Amount** | Large display of the total calculated amount (e.g., ₹500) |
| **Method Toggle** | **Cash** (Icon: Payments) / **UPI** (Icon: QR Code) |
| **UPI QR** | Displays a payment QR if UPI is selected (Mock placeholder) |
| **Paid Button** | "PAID" action button → Navigates to Rate Worker |
| **Voice Voice** | "Dabbulu pay cheyyandi" (Please pay the amount) |

---

## Navigation Flow

```
Screen 14 (QR Attendance OUT)
  → Worker Scans
    → Screen 15 (Payment)     ← THIS SCREEN
      → Select Cash/UPI
      → Tap "PAID"
        → Screen 16 (Rate Worker)
```

---

## Files Modified

| File | Change |
|:--|:--|
| [PaymentScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/farmer/PaymentScreen.js) | **[NEW]** Payment UI logic |
| [QRAttendanceOUTScreen.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/screens/farmer/QRAttendanceOUTScreen.js) | Updated nav to `Payment` instead of Home |
| [AppNavigator.js](file:///c:/Users/renan/OneDrive/Desktop/edhigo_pani/mobile/src/navigation/AppNavigator.js) | Added `Payment` route (implied, checking...) |
```

**Note:** I need to ensure `Payment` is registered in `AppNavigator.js`. I might have missed that step in the tool calls. Checking now.
