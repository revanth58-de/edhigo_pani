// Complete App Navigation Structure - All 32 Screens Wired
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../store/authStore';
import { colors } from '../theme/colors';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LanguageSelectionScreen from '../screens/auth/LanguageSelectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Farmer Screens
import FarmerHomeScreen from '../screens/farmer/FarmerHomeScreen';
import FarmerProfileScreen from '../screens/farmer/FarmerProfileScreen';
import FarmerHistoryScreen from '../screens/farmer/FarmerHistoryScreen';
import SelectWorkersScreen from '../screens/farmer/SelectWorkersScreen';
import RequestSentScreen from '../screens/farmer/RequestSentScreen';
import RequestAcceptedScreen from '../screens/farmer/RequestAcceptedScreen';
import ArrivalAlertScreen from '../screens/farmer/ArrivalAlertScreen';
import QRAttendanceScreen from '../screens/farmer/QRAttendanceScreen';
import WorkInProgressScreen from '../screens/farmer/WorkInProgressScreen';
import PaymentScreen from '../screens/farmer/PaymentScreen';
import RateWorkerScreen from '../screens/farmer/RateWorkerScreen';

// Worker Screens
import WorkerHomeScreen from '../screens/worker/WorkerHomeScreen';
import JobOfferScreen from '../screens/worker/JobOfferScreen';
import NavigationScreen from '../screens/worker/NavigationScreen';
import QRScannerScreen from '../screens/worker/QRScannerScreen';
import AttendanceConfirmedScreen from '../screens/worker/AttendanceConfirmedScreen';
import WorkStatusScreen from '../screens/worker/WorkStatusScreen';
import RateFarmerScreen from '../screens/worker/RateFarmerScreen';
import WorkerProfileScreen from '../screens/worker/WorkerProfileScreen';
import JobCancelledScreen from '../screens/worker/JobCancelledScreen';

// Leader Screens
import LeaderHomeScreen from '../screens/leader/LeaderHomeScreen';
import LeaderProfileScreen from '../screens/leader/LeaderProfileScreen';
import GroupSetupScreen from '../screens/leader/GroupSetupScreen';
import GroupJobOfferScreen from '../screens/leader/GroupJobOfferScreen';
import GroupQRAttendanceScreen from '../screens/leader/GroupQRAttendanceScreen';
import GroupAttendanceConfirmedScreen from '../screens/leader/GroupAttendanceConfirmedScreen';
import RateFarmerLeaderScreen from '../screens/leader/RateFarmerLeaderScreen';

// Shared Screens
import LiveMapDiscoveryScreen from '../screens/shared/LiveMapDiscoveryScreen';
import LiveMapCallScreen from '../screens/shared/LiveMapCallScreen';

const Stack = createNativeStackNavigator();

// ── Auth Stack ──
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="OTP" component={OTPScreen} />
    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
  </Stack.Navigator>
);

// ── Farmer Stack ──
const FarmerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FarmerHome" component={FarmerHomeScreen} />
    <Stack.Screen name="FarmerHistory" component={FarmerHistoryScreen} />
    <Stack.Screen name="FarmerProfile" component={FarmerProfileScreen} />
    <Stack.Screen name="SelectWorkers" component={SelectWorkersScreen} />
    <Stack.Screen name="RequestSent" component={RequestSentScreen} />
    <Stack.Screen name="RequestAccepted" component={RequestAcceptedScreen} />
    <Stack.Screen name="ArrivalAlert" component={ArrivalAlertScreen} />
    <Stack.Screen name="QRAttendance" component={QRAttendanceScreen} />
    <Stack.Screen name="WorkInProgress" component={WorkInProgressScreen} />
    <Stack.Screen name="Payment" component={PaymentScreen} />
    <Stack.Screen name="RateWorker" component={RateWorkerScreen} />
    <Stack.Screen name="LiveMapDiscovery" component={LiveMapDiscoveryScreen} />
    <Stack.Screen name="LiveMapCall" component={LiveMapCallScreen} />
  </Stack.Navigator>
);

// ── Worker Stack ──
const WorkerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="WorkerHome" component={WorkerHomeScreen} />
    <Stack.Screen name="JobOffer" component={JobOfferScreen} />
    <Stack.Screen name="Navigation" component={NavigationScreen} />
    <Stack.Screen name="QRScanner" component={QRScannerScreen} />
    <Stack.Screen name="AttendanceConfirmed" component={AttendanceConfirmedScreen} />
    <Stack.Screen name="WorkStatus" component={WorkStatusScreen} />
    <Stack.Screen name="RateFarmer" component={RateFarmerScreen} />
    <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} />
    <Stack.Screen name="JobCancelled" component={JobCancelledScreen} />
    <Stack.Screen name="LiveMapDiscovery" component={LiveMapDiscoveryScreen} />
    <Stack.Screen name="LiveMapCall" component={LiveMapCallScreen} />
  </Stack.Navigator>
);

// ── Leader Stack ──
const LeaderNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="LeaderHome" component={LeaderHomeScreen} />
    <Stack.Screen name="LeaderProfile" component={LeaderProfileScreen} />
    <Stack.Screen name="GroupSetup" component={GroupSetupScreen} />
    <Stack.Screen name="GroupJobOffer" component={GroupJobOfferScreen} />
    <Stack.Screen name="GroupQRAttendance" component={GroupQRAttendanceScreen} />
    <Stack.Screen name="GroupAttendanceConfirmed" component={GroupAttendanceConfirmedScreen} />
    <Stack.Screen name="RateFarmerLeader" component={RateFarmerLeaderScreen} />
    <Stack.Screen name="LiveMapDiscovery" component={LiveMapDiscoveryScreen} />
    <Stack.Screen name="LiveMapCall" component={LiveMapCallScreen} />
  </Stack.Navigator>
);

// ── Main Navigator ──
const AppNavigator = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state._hydrated);
  const rehydrate = useAuthStore((state) => state.rehydrate);

  useEffect(() => {
    rehydrate();
  }, []);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F4F0' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      <NavigationContainer>
        {!isAuthenticated ? (
          <AuthNavigator />
        ) : !user?.role ? (
          // Authenticated but no role yet (just completed OTP) → go pick a role
          <AuthNavigator />
        ) : user?.role === 'worker' ? (
          <WorkerNavigator />
        ) : user?.role === 'leader' ? (
          <LeaderNavigator />
        ) : (
          <FarmerNavigator />
        )}
      </NavigationContainer>
    </SafeAreaView>
  );
};

export default AppNavigator;

