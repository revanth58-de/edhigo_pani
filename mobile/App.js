import React from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';

// Suppress deprecated pointerEvents warning from libraries
LogBox.ignoreLogs(['props.pointerEvents is deprecated. Use style.pointerEvents']);

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
