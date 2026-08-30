# Dinasari — Android Production Deployment Guide

**App:** Dinasari
**Package:** `com.dinasari.app`
**Version:** 1.0.0 (versionCode: 1)
**Target:** Google Play Store

---

## Prerequisites

Before you begin, ensure the following are installed:

| Tool | Version | Check |
|------|---------|-------|
| Node.js | ≥ 18 | `node --version` |
| npm | ≥ 9 | `npm --version` |
| Java JDK | 17 or 21 | `java --version` |
| Android Studio | Latest | With SDK Platform 36 installed |
| Android SDK | API 36 (Android 15) | Via Android Studio SDK Manager |

**Environment Variables** — ensure these are set in your system:
```
ANDROID_HOME=C:\Users\<you>\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-21
```

---

## Step 1: Clone and Install Dependencies

```bash
# Navigate to the mobile project directory
cd c:\V6\edhigo_pani\mobile

# Install all dependencies
npm install
```

---

## Step 2: Verify Environment Variables

The `.env` file is pre-configured for production. Verify it contains:

```env
EXPO_PUBLIC_API_URL=https://www.dinasari.co.in
EXPO_PUBLIC_SENTRY_DSN=YOUR_SENTRY_DSN
EXPO_PUBLIC_OPENWEATHER_API_KEY=YOUR_OPENWEATHER_API_KEY
```

> **Important**: The `.env` file is already configured. Do NOT change `EXPO_PUBLIC_API_URL` back to localhost.

---

## Step 3: Regenerate the Android Folder (When Native Configs / Env Change)

> ⚠️ **CRITICAL ARCHITECTURE NOTE**: Any time `app.config.js` env vars change (such as `GOOGLE_MAPS_API_KEY`), `android/` must be regenerated via `npx expo prebuild --platform android --clean` for native manifest changes to take effect — this does NOT happen automatically at runtime.

```bash
# Regenerate native Android project from app.config.js
npx expo prebuild --platform android --clean
```

> **Important**: After running `prebuild --clean`, verify that your Gradle signing config in `android/app/build.gradle` and ProGuard rules in `android/app/proguard-rules.pro` remain intact.

---

## Step 4: Create Your Release Keystore

> **Do this only once.** The keystore must be kept safe forever — if lost, you cannot update your app on the Play Store.

### 4a. Generate the keystore

Open a terminal and run:

```bash
# Run from the android/app/ directory
cd c:\V6\edhigo_pani\mobile\android\app

keytool -genkeypair -v `
  -keystore dinasari-release.jks `
  -alias dinasari `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

You will be prompted for:
- **Keystore password** (remember this!)
- **Key password** (can be same as keystore password)
- Your name, organization, city, country (for the certificate)

### 4b. Configure keystore.properties

Edit `c:\V6\edhigo_pani\mobile\android\keystore.properties`:

```properties
storeFile=app/dinasari-release.jks
storePassword=YOUR_ACTUAL_KEYSTORE_PASSWORD
keyAlias=dinasari
keyPassword=YOUR_ACTUAL_KEY_PASSWORD
```

> **Security**: `keystore.properties` and `dinasari-release.jks` are listed in `.gitignore` — they will never be committed to version control. Store them in a secure location (e.g., a password manager or encrypted drive).

---

## Step 5: Build the Android App Bundle (.aab)

```bash
# From the mobile directory
cd c:\V6\edhigo_pani\mobile

# Option A: Using npm script
npm run build:android

# Option B: Direct Gradle command (PowerShell)
cd android
.\gradlew.bat bundleRelease

# Option C: Using EAS cloud build (requires Expo account)
npm run build:eas
```

**Build time:** Approximately 5–15 minutes on first run (Gradle downloads dependencies).
Subsequent builds are faster due to Gradle caching.

---

## Step 6: Locate the Output

After a successful build, the AAB file is at:

```
c:\V6\edhigo_pani\mobile\android\app\build\outputs\bundle\release\app-release.aab
```

Verify the file exists:
```powershell
Get-Item "c:\V6\edhigo_pani\mobile\android\app\build\outputs\bundle\release\app-release.aab"
```

---

## Step 7: Upload to Google Play Console

### 7a. Create a Play Console account

1. Go to https://play.google.com/console
2. Create a developer account (one-time $25 USD fee)
3. Accept the Developer Distribution Agreement

### 7b. Create a new app

1. Click **"Create app"**
2. Set:
   - **App name**: Dinasari
   - **Default language**: English (or your preferred language)
   - **App or game**: App
   - **Free or paid**: Free
3. Accept the declarations and click **Create app**

### 7c. Fill in the Store Listing

Navigate to **Grow > Store presence > Main store listing**:
- **App name**: Dinasari
- **Short description**: (see `store/STORE_LISTING.md`)
- **Full description**: (see `store/STORE_LISTING.md`)
- **App icon**: Upload a 512×512 PNG (resize `assets/icon.png`)
- **Feature graphic**: Upload a 1024×500 PNG
- **Screenshots**: Upload at least 2 phone screenshots
- **Category**: Business
- **Email**: support@dinasari.co.in
- **Privacy Policy URL**: https://www.dinasari.co.in/privacy

### 7d. Set up Content Rating

Navigate to **Policy > App content > Content rating**:
1. Click **Start questionnaire**
2. Select category: **Utility / Productivity**
3. Answer "No" to all sensitive content questions
4. Submit — you will receive a rating (likely "Everyone")

### 7e. Set Target Audience

Navigate to **Policy > App content > Target audience**:
- Select age group: **18 and over**

### 7f. Add Data Safety

Navigate to **Policy > App content > Data safety**:
Fill in data collection disclosures based on `store/privacy_policy.md`:

| Data type | Collected | Shared | Required |
|-----------|-----------|--------|----------|
| Phone number | Yes | No | Yes |
| Precise location | Yes | No (Maps only) | Yes |
| Name | Yes | Yes (to matched party) | Yes |
| Crash logs | Yes | No | No |

### 7g. Upload the AAB

1. Navigate to **Release > Testing > Internal testing** (recommended for first upload)
   - Or **Release > Production** for direct production release
2. Click **Create new release**
3. Under **App bundles**, click **Upload** and select your `app-release.aab`
4. Add release notes (What's new):
   ```
   Initial release of Dinasari — connecting farmers with agricultural workers.
   ```
5. Click **Save** then **Review release**

---

## Step 8: Review and Publish

1. Go through the **Release overview** checklist — all items should be green
2. Fix any errors reported
3. Click **Start rollout to Production** (or Internal testing if testing first)
4. The app will go through Google Play review (typically 1–3 days for new apps)
5. Once approved, it will be live on the Play Store

---

## Troubleshooting

### Build Failures

**Gradle out of memory:**
```bash
# Edit android/gradle.properties
org.gradle.jvmargs=-Xmx6144m -XX:MaxMetaspaceSize=512m
```

**Metro bundler error during build:**
```bash
# Clean Gradle and rebuild
cd android
.\gradlew.bat clean
.\gradlew.bat bundleRelease
```

**Keystore not found error:**
- Ensure `android/keystore.properties` exists with correct paths
- Ensure `dinasari-release.jks` is in `android/app/`
- Check that `storeFile=app/dinasari-release.jks` (relative to `android/`)

**"Task :app:bundleRelease FAILED":**
```bash
# Check detailed error
.\gradlew.bat bundleRelease --info --stacktrace 2>&1 | Select-String -Pattern "ERROR|FAILED|error"
```

### Play Store Rejection Reasons (Common)

| Issue | Fix |
|-------|-----|
| Missing privacy policy | Host policy at https://www.dinasari.co.in/privacy |
| Incomplete data safety section | Fill all fields in Play Console > App content > Data safety |
| App crashes on launch | Test on a physical device before submitting |
| Missing content rating | Complete the content rating questionnaire |

---

## Updating the App (Future Releases)

1. Increment `versionCode` in `android/app/build.gradle` (must be strictly increasing)
2. Update `versionName` in `android/app/build.gradle`
3. Update `store/version_info.json`
4. Rebuild: `npm run build:android`
5. Upload new AAB to Play Console > Production > Create new release

---

## Build Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `npm run build:android` | `cd android && gradlew.bat bundleRelease` | Build release AAB |
| `npm run build:android:apk` | `cd android && gradlew.bat assembleRelease` | Build release APK (for direct install) |
| `npm run build:android:clean` | `cd android && gradlew.bat clean` | Clear Gradle build cache |
| `npm run build:eas` | `eas build --platform android --profile production` | Cloud build via EAS |
| `npm run prebuild` | `expo prebuild --platform android --no-install` | Regenerate android/ folder |

---

## File Reference

| File | Purpose |
|------|---------|
| `mobile/.env` | Environment variables (production URLs) |
| `mobile/app.json` | Expo config (app name, package ID, permissions) |
| `mobile/eas.json` | EAS cloud build configuration |
| `android/app/build.gradle` | Gradle build config (SDK versions, signing) |
| `android/gradle.properties` | Gradle JVM and optimization settings |
| `android/keystore.properties` | Signing credentials (NOT in git) |
| `android/app/dinasari-release.jks` | Keystore file (NOT in git — store securely) |
| `android/app/proguard-rules.pro` | R8/ProGuard optimization rules |
| `android/app/src/main/AndroidManifest.xml` | App permissions and metadata |
| `store/privacy_policy.md` | Privacy policy (host on website) |
| `store/STORE_LISTING.md` | Play Store listing copy |
| `store/version_info.json` | Version tracking |
