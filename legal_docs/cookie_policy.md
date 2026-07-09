# Cookie and Local Storage Policy

**Last Updated:** July 2026

At **Dinasari**, we believe in being clear and open about how we collect and use data related to you. This Cookie and Local Storage Policy explains how we use cookies, local storage (such as HTML5 LocalStorage, React Native Async Storage, and Expo SecureStore), and similar tracking technologies on our mobile application and related web portals.

---

## 1. What Are Cookies and Local Storage?
* **Cookies:** Small text files stored on your browser or device by web servers. They allow websites to remember your actions and preferences.
* **Local Storage / AsyncStorage:** Mobile app storage mechanisms that allow the Dinasari app to save persistent data directly on your device (e.g., in a secure partition). This storage is critical for offline-first capabilities and keeping you logged in.

---

## 2. Why Do We Use These Technologies?
We use these technologies on your device for the following purposes:
* **Authentication and Session State:** We use secure storage to store your JSON Web Token (JWT). This keeps you securely logged in so you do not need to enter an OTP every time you open the app.
* **Preferences & Customization:** We store your preferred language selection (English, Hindi, or Telugu) and your selected user role (Farmer, Worker, Group Leader) so that the app opens in the correct mode.
* **Performance & Cache:** We cache certain temporary data, such as crop listings, worker list pages, and offline notifications, to reduce mobile data usage and load pages faster.
* **Analytics:** We use anonymous device identifiers to track app stability, load times, and crashes (e.g., via Sentry) to fix bugs and improve performance.

---

## 3. Types of Data Stored Locally
* Your login session token (JWT) – stored securely using **Expo SecureStore** (which uses iOS Keychain / Android Keystore).
* Your language preference code (`en`, `hi`, `te`).
* Your active role key (`farmer`, `worker`, `leader`).
* Offline notification logs and queue of actions to sync when network is restored.

---

## 4. How to Manage Storage Preferences
Since Dinasari is primarily a mobile application, standard web browser cookie-blocking controls do not apply inside the app.
* **Session Persistence:** If you want to clear your session token and preferences, you can simply tap the **Logout** button on your Profile page. This will instantly delete your JWT and clear local session caches.
* **Permissions:** You can manage device permissions (like GPS Location and Camera access for QR scanning) directly through your mobile device's system settings.

---

## 5. Contact Us
If you have any questions about our use of cookies or local storage, please write to us at support@dinasari.in.
