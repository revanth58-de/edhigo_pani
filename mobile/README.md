# Dinasari — Mobile Application (React Native / Expo)

This directory contains the mobile application for **Dinasari** (`com.dinasari.app`), connecting farmers, agricultural workers, and group leaders across India.

---

## ⚠️ Important Architecture & Native Prebuild Rule

> **CRITICAL**: Any time `app.config.js` or environment variables change (such as `GOOGLE_MAPS_API_KEY`), `android/` must be regenerated via `npx expo prebuild --platform android --clean` for native manifest changes to take effect — this does NOT happen automatically.

---

## Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Run unit & component tests
npm test

# 3. Start local Expo development server
npm start

# 4. Regenerate native Android folder from dynamic app.config.js
npx expo prebuild --platform android --clean

# 5. Build Android Release App Bundle (AAB) for Play Store
npm run build:eas
# Or local Gradle build:
npm run build:android
```

For complete release, signing, and Play Store publishing steps, refer to [DEPLOYMENT.md](DEPLOYMENT.md).
