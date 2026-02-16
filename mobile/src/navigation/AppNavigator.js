// Complete App Navigation Structure - All 32 Screens Wired
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import useAuthStore from '../store/authStore';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LanguageSelectionScreen from '../screens/auth/LanguageSelectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';

// Farmer Screens
import FarmerHomeScreen from '../screens/farmer/FarmerHomeScreen';
import FarmerProfileScreen from '../screens/farmer/FarmerProfileScreen';
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

// Leader Screens
import LeaderHomeScreen from '../screens/leader/LeaderHomeScreen';
import GroupSetupScreen from '../screens/leader/GroupSetupScreen';
import GroupJobOfferScreen from '../screens/leader/GroupJobOfferScreen';
import GroupQRAttendanceScreen from '../screens/leader/GroupQRAttendanceScreen';
import GroupAttendanceConfirmedScreen from '../screens/leader/GroupAttendanceConfirmedScreen';
import RateFarmerLeaderScreen from '../screens/leader/RateFarmerLeaderScreen';

// Shared Screens
import LiveMapDiscoveryScreen from '../screens/shared/LiveMapDiscoveryScreen';
import LiveMapCallScreen from '../screens/shared/LiveMapCallScreen';

const Stack = createNativeStackNavigator();

// Auth Stack Navigator
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="OTP" component={OTPScreen} />
    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
  </Stack.Navigator>
);

// Farmer Stack Navigator
const FarmerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FarmerHome" component={FarmerHomeScreen} />
    <Stack.Screen name="FarmerProfile" component={FarmerProfileScreen} />
    <Stack.Screen name="SelectWorkers" component={SelectWorkersScreen} />
    <Stack.Screen name="RequestSent" component={RequestSentScreen} />
    <Stack.Screen name="RequestAccepted" component={RequestAcceptedScreen} />
    <Stack.Screen name="ArrivalAlert" component={ArrivalAlertScreen} />
    <Stack.Screen name="QRAttendance" component={QRAttendanceScreen} />
    <Stack.Screen name="WorkInProgress" component={WorkInProgressScreen} />
    <Stack.Screen name="Payment" component={PaymentScreen} />
    <Stack.Screen name="RateWorker" component={RateWorkerScreen} />
    {/* Shared screens accessible from farmer */}
    <Stack.Screen name="LiveMapDiscovery" component={LiveMapDiscoveryScreen} />
    <Stack.Screen name="LiveMapCall" component={LiveMapCallScreen} />
  </Stack.Navigator>
);

// Worker Stack Navigator
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
    {/* Shared screens accessible from worker */}
    <Stack.Screen name="LiveMapDiscovery" component={LiveMapDiscoveryScreen} />
    <Stack.Screen name="LiveMapCall" component={LiveMapCallScreen} />
  </Stack.Navigator>
);

// Leader Stack Navigator
const LeaderNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="LeaderHome" component={LeaderHomeScreen} />
    <Stack.Screen name="GroupSetup" component={GroupSetupScreen} />
    <Stack.Screen name="GroupJobOffer" component={GroupJobOfferScreen} />
    <Stack.Screen name="GroupQRAttendance" component={GroupQRAttendanceScreen} />
    <Stack.Screen name="GroupAttendanceConfirmed" component={GroupAttendanceConfirmedScreen} />
    <Stack.Screen name="RateFarmerLeader" component={RateFarmerLeaderScreen} />
    {/* Shared screens accessible from leader */}
    <Stack.Screen name="LiveMapDiscovery" component={LiveMapDiscoveryScreen} />
    <Stack.Screen name="LiveMapCall" component={LiveMapCallScreen} />
  </Stack.Navigator>
);

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : !user?.role ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        </Stack.Navigator>
      ) : user.role === 'farmer' ? (
        <FarmerNavigator />
      ) : user.role === 'worker' ? (
        <WorkerNavigator />
      ) : user.role === 'leader' ? (
        <LeaderNavigator />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
