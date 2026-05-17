# Complete App Testing Guide

A systematic guide to test all 32 screens and ensure everything is working without errors.

## Pre-Testing Checklist

### Servers Running

- [ ] **Backend Server**: `npm run dev` in `/backend` → Should show `🚀 FarmConnect server running on port 5000`
- [ ] **Expo Server**: `npx expo start --tunnel` in `/mobile` → Should show QR code
- [ ] **App Loaded on iPhone**: Scan QR code, wait for bundle to load

### Check for Console Errors

Open both terminals and watch for:

- ❌ Red error messages
- ⚠️ Yellow warning messages
- ✅ Green success messages

---

## Testing Methodology

For each screen, check:

1. ✅ **Screen Loads** - No blank/white screen
2. ✅ **No Console Errors** - Check both terminals
3. ✅ **UI Renders Correctly** - All elements visible
4. ✅ **Interactions Work** - Buttons, inputs, navigation
5. ✅ **API Calls Work** - If screen makes backend requests

---

## 📱 Screen Testing Checklist

### Auth Flow (5 Screens)

#### 1. Splash Screen

- [ ] Screen loads automatically on app start
- [ ] Logo/branding displays
- [ ] Auto-navigates to Language Selection (2-3 seconds)
- [ ] No errors in console

#### 2. Language Selection Screen

- [ ] Multiple language options visible
- [ ] Can select a language
- [ ] Voice guidance plays (if implemented)
- [ ] "Continue" button works
- [ ] Navigates to Login screen

#### 3. Login Screen (Phone Entry)

- [ ] Custom keypad displays
- [ ] Can enter 10-digit number
- [ ] Phone number formats correctly (0000 000000)
- [ ] Backspace works
- [ ] "Continue" button disabled until 10 digits entered
- [ ] Voice guidance works
- [ ] **API Test**: Click Continue → OTP should send
- [ ] Check terminal: Should see `POST /api/auth/send-otp`
- [ ] **Error Check**: No "Network Error" alert
- [ ] Navigates to OTP screen with phone number

#### 4. OTP Screen

- [ ] Shows phone number entered
- [ ] OTP display visible (4-6 digits)
- [ ] Can enter OTP
- [ ] "Verify" button works
- [ ] **API Test**: Verify OTP → Should authenticate
- [ ] Check terminal: Should see `POST /api/auth/verify-otp`
- [ ] Navigates to Role Selection

#### 5. Role Selection Screen

- [ ] Three role cards visible: Farmer, Worker, Leader
- [ ] Can select a role
- [ ] "Continue" button works
- [ ] **API Test**: Role selection → Should update user
- [ ] Check terminal: Should see `POST /api/auth/set-role`
- [ ] Navigates to appropriate home screen based on role

---

### Farmer Flow (10 Screens)

**How to Test**: After Role Selection, choose "Farmer"

#### 6. Farmer Home Screen

- [ ] Dashboard displays
- [ ] Profile button visible
- [ ] "Find Workers" or "Create Job" button visible
- [ ] Navigation works

#### 7. Farmer Profile Screen

- [ ] User info displays
- [ ] Can edit profile fields
- [ ] Save button works
- [ ] **API Test**: Update profile
- [ ] Check terminal: `PUT /api/auth/profile`

#### 8. Select Workers Screen

- [ ] List of available workers shows
- [ ] Can filter/search workers
- [ ] Worker cards display info (name, rating, etc.)
- [ ] Can select multiple workers
- [ ] "Send Request" button works
- [ ] **API Test**: Send job request
- [ ] Navigates to Request Sent

#### 9. Request Sent Screen

- [ ] Confirmation message displays
- [ ] Shows workers requested
- [ ] "View Status" or "Home" button works

#### 10. Request Accepted Screen

- [ ] Shows accepted workers
- [ ] Worker details visible
- [ ] "Continue" or "Generate QR" button works
- [ ] Navigates to next screen

#### 11. Arrival Alert Screen

- [ ] Alert/notification displays
- [ ] Worker arrival information shows
- [ ] Map or location info (if implemented)
- [ ] "Acknowledge" or "Continue" works

#### 12. QR Attendance Screen

- [ ] QR code generates and displays
- [ ] QR code is scannable
- [ ] Instruction text visible
- [ ] "Done" or "Continue" button works

#### 13. Work In Progress Screen

- [ ] Shows job status
- [ ] Worker list displays
- [ ] Time tracking visible
- [ ] "Complete Work" button works
- [ ] Navigates to Payment screen

#### 14. Payment Screen

- [ ] Payment summary shows
- [ ] Worker payment breakdown visible
- [ ] Total amount calculated
- [ ] Payment method selection works
- [ ] "Confirm Payment" button works
- [ ] **API Test**: Process payment
- [ ] Navigates to Rating screen

#### 15. Rate Worker Screen

- [ ] Worker names display
- [ ] Star rating component works (1-5 stars)
- [ ] Can add text feedback
- [ ] "Submit Rating" button works
- [ ] **API Test**: Submit rating
- [ ] Check terminal: `POST /api/ratings`
- [ ] Navigates back to Home

---

### Worker Flow (8 Screens)

**How to Test**: Logout → Login again → Choose "Worker"

#### 16. Worker Home Screen

- [ ] Dashboard displays
- [ ] Available jobs list shows
- [ ] Profile button visible
- [ ] Can view job details

#### 17. Job Offer Screen

- [ ] Job details display (farmer, location, pay, etc.)
- [ ] "Accept" and "Reject" buttons work
- [ ] **API Test**: Accept job
- [ ] Check terminal: `POST /api/jobs/{id}/accept`
- [ ] Navigates to Navigation screen

#### 18. Navigation Screen

- [ ] Shows route to farm/job location
- [ ] Map displays (if implemented)
- [ ] "Start Navigation" or "Arrived" button works
- [ ] Navigates to QR Scanner

#### 19. QR Scanner Screen

- [ ] Camera permission requested
- [ ] Camera view displays
- [ ] Can scan QR code
- [ ] QR scan triggers attendance check-in
- [ ] **API Test**: Check-in attendance
- [ ] Check terminal: `POST /api/attendance/check-in`
- [ ] Navigates to Attendance Confirmed

#### 20. Attendance Confirmed Screen

- [ ] Confirmation message displays
- [ ] Check-in time shows
- [ ] Job details visible
- [ ] "Start Work" button works

#### 21. Work Status Screen

- [ ] Current job status shows
- [ ] Time elapsed displays
- [ ] "Complete Work" button works
- [ ] **API Test**: Check-out
- [ ] Check terminal: `POST /api/attendance/check-out`

#### 22. Rate Farmer Screen

- [ ] Farmer name displays
- [ ] Star rating works (1-5)
- [ ] Feedback text field works
- [ ] "Submit" button works
- [ ] **API Test**: Submit rating
- [ ] Navigates back to Home

#### 23. Worker Profile Screen

- [ ] Worker info displays
- [ ] Can edit profile
- [ ] Work history visible
- [ ] Ratings display
- [ ] Save changes works

---

### Leader Flow (6 Screens)

**How to Test**: Logout → Login again → Choose "Leader"

#### 24. Leader Home Screen

- [ ] Dashboard displays
- [ ] Group management section visible
- [ ] Available jobs list shows
- [ ] "Create Group" or "Manage Group" works

#### 25. Group Setup Screen

- [ ] Can add workers to group
- [ ] Worker search works
- [ ] Selected workers list displays
- [ ] "Save Group" button works
- [ ] **API Test**: Create/update group
- [ ] Check terminal: Should see group API calls

#### 26. Group Job Offer Screen

- [ ] Job details for group display
- [ ] Number of workers needed shows
- [ ] Group member list visible
- [ ] "Accept for Group" button works
- [ ] **API Test**: Accept job for group

#### 27. Group QR Attendance Screen

- [ ] Group QR code displays
- [ ] All group members listed
- [ ] Check-in status for each member
- [ ] Can scan for group attendance

#### 28. Group Attendance Confirmed Screen

- [ ] Confirmation for all members
- [ ] List of checked-in workers
- [ ] Missing workers highlighted
- [ ] "Continue" button works

#### 29. Rate Farmer (Leader) Screen

- [ ] Similar to worker rating
- [ ] Can rate on behalf of group
- [ ] Submit works
- [ ] **API Test**: Submit rating

---

### Shared Screens (2 Screens)

**How to Test**: Accessible from Farmer, Worker, or Leader flows

#### 30. Live Map Discovery Screen

- [ ] Map displays
- [ ] Shows available workers/farmers in area
- [ ] Markers on map work
- [ ] Can tap markers for details
- [ ] Location updates in real-time
- [ ] "Call" or "Contact" button works

#### 31. Live Map Call Screen

- [ ] Shows selected person details
- [ ] Map with route displays
- [ ] Distance/time info shows
- [ ] "Call" button works (if implemented)
- [ ] "Message" button works (if implemented)

---

## 🔍 Common Issues to Check

### Runtime Errors

Look for these in terminals:

```
ERROR  [error message]
```

Common causes:

- Missing API endpoint
- Network timeout
- Invalid data format
- Missing permissions (camera, location)

### Navigation Errors

```
ERROR  The action 'NAVIGATE' with payload {"name":"ScreenName"} was not handled
```

Fix: Check `AppNavigator.js` - screen might not be registered

### API Errors

```
ERROR  Send OTP Error: [AxiosError: Network Error]
```

Causes:

- Backend server not running
- Wrong API URL in config
- Firewall blocking connection

### Import Errors

```
ERROR  Unable to resolve module
```

Fix: Check import paths, run `npm install` if package missing

---

## 🧪 API Testing Checklist

Open a new PowerShell terminal and test backend endpoints:

### Auth Endpoints

```powershell
# Test send OTP
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/send-otp" -Method POST -Body (@{phone="+919876543210"} | ConvertTo-Json) -ContentType "application/json"

# Should return: { success: true, otp: "1234" }
```

### Job Endpoints (requires auth token)

```powershell
# Get jobs
Invoke-RestMethod -Uri "http://localhost:5000/api/jobs" -Method GET
```

### Health Check

```powershell
# Test backend is alive
Invoke-RestMethod -Uri "http://localhost:5000/health"

# Should return: { status: "ok", ... }
```

---

## 📊 Testing Summary Template

Use this to track your testing:

```
## Test Session: [Date]

### Environment
- Backend: ✅/❌ Running
- Expo: ✅/❌ Running
- Device: iPhone/Android

### Screens Tested
Auth: ✅ 5/5 screens passed
Farmer: ✅ 8/10 screens passed (2 issues found)
Worker: ⏳ 3/8 screens tested
Leader: ❌ Not tested yet
Shared: ✅ 2/2 screens passed

### Issues Found
1. [Screen Name]: [Issue description]
2. [Screen Name]: [Issue description]

### API Calls Working
- ✅ Send OTP
- ✅ Verify OTP
- ✅ Set Role
- ❌ Create Job (500 error)
- ✅ Submit Rating
```

---

## 🚀 Quick Testing Tips

1. **Test One Flow at a Time**: Complete Auth → Farmer → Worker → Leader
2. **Watch Both Terminals**: Keep backend and Expo terminals visible
3. **Use Expo Dev Menu**: Shake phone → "Reload" if something breaks
4. **Clear Cache if Needed**: `npx expo start --clear`
5. **Test on Real Data**: Use actual phone numbers during testing
6. **Check Network Tab**: In Expo dev tools, monitor API calls

---

## 🔧 Troubleshooting

### App Crashes

1. Check Expo terminal for error stack trace
2. Look for red error screen on device
3. Reload app (shake → reload)

### Screen Doesn't Load

1. Check import in `AppNavigator.js`
2. Verify screen is added to correct navigator
3. Check for syntax errors in screen file

### API Call Fails

1. Confirm backend running on port 5000
2. Check API URL in `config/api.config.js`
3. Verify endpoint exists in backend
4. Check request payload format

### Navigation Doesn't Work

1. Verify screen name matches in navigator
2. Check navigation params are passed correctly
3. Ensure stack navigator includes the target screen

---

## ✅ Definition of "Working Properly"

A screen is working properly when:

1. ✅ Loads without errors
2. ✅ UI renders completely
3. ✅ User interactions respond
4. ✅ API calls succeed (if applicable)
5. ✅ Navigation works correctly
6. ✅ No console errors or warnings
7. ✅ Data displays correctly
8. ✅ Handles edge cases (empty states, errors)

---

Good luck with testing! 🎉
