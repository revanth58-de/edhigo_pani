/**
 * Sentry crash reporting configuration for DINASARI mobile app.
 *
 * Setup:
 * 1. Create a project at https://sentry.io
 * 2. Go to Project Settings → Client Keys (DSN)
 * 3. Add to mobile/.env:  EXPO_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
 * 4. For production source maps: npx sentry-expo-upload-sourcemaps
 */

import * as Sentry from '@sentry/react-native';

// Expo exposes env vars as EXPO_PUBLIC_* at build time
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

export const initSentry = () => {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.info('ℹ️ [Sentry] DSN not set. Add EXPO_PUBLIC_SENTRY_DSN to mobile/.env to enable crash reporting.');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: !__DEV__,             // Disabled in dev to avoid noise — active in production builds
    debug: false,
    tracesSampleRate: 0.2,         // Capture 20% of transactions (tune this up/down based on volume)
    environment: __DEV__ ? 'development' : 'production',

    // Privacy protection: strip phone numbers before sending to Sentry
    beforeSend(event) {
      if (event.extra?.phone)    event.extra.phone = '[redacted]';
      if (event.user?.phone)     event.user.phone  = '[redacted]';
      if (event.extra?.otp)      delete event.extra.otp;
      return event;
    },
  });

  if (!__DEV__) {
    console.log('✅ [Sentry] Crash reporting active');
  }
};

/**
 * Report a caught exception (e.g. from ErrorBoundary or try/catch).
 * Safe to call whether or not Sentry is configured.
 */
export const captureError = (error, context = {}) => {
  if (!SENTRY_DSN || __DEV__) {
    console.error('🔴 [captureError]', error, context);
    return;
  }
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value));
    Sentry.captureException(error);
  });
};

/**
 * Log a non-fatal message to Sentry (e.g. unexpected API response shape).
 */
export const captureMessage = (message, level = 'warning') => {
  if (!SENTRY_DSN || __DEV__) {
    console.warn(`[Sentry message:${level}]`, message);
    return;
  }
  Sentry.captureMessage(message, level);
};

/**
 * Identify the authenticated user so crashes can be correlated.
 * Only sends userId + role — no phone number or personal data.
 * Call this right after a successful login.
 */
export const identifySentryUser = (userId, role) => {
  if (!SENTRY_DSN) return;
  Sentry.setUser({ id: userId, role });
};

/**
 * Clear user context on logout.
 */
export const clearSentryUser = () => {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
};
