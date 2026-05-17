import React from 'react';
import { LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import { initSentry } from './src/config/sentry';

// Initialize crash reporting before anything renders
initSentry();

// Suppress deprecated pointerEvents warning from libraries
LogBox.ignoreLogs(['props.pointerEvents is deprecated. Use style.pointerEvents']);

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider style={{ flex: 1 }}>
        {/* Offline banner overlays everything — it slides in when connection is lost */}
        <OfflineBanner />
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
