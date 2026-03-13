// Complete App Navigation Structure - All 32 Screens Wired
// Re-bundle trigger
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform, TouchableOpacity, Alert } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import { colors } from '../theme/colors';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { authAPI, groupAPI } from '../services/api';
import { socketService } from '../services/socketService';

import * as Notifications from 'expo-notifications';

// Ensure foreground notifications show a visual UI banner
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
import WorkerPaymentHistoryScreen from '../screens/worker/WorkerPaymentHistoryScreen';

// Leader Screens
import LeaderHomeScreen from '../screens/leader/LeaderHomeScreen';
import LeaderProfileScreen from '../screens/leader/LeaderProfileScreen';
import GroupSetupScreen from '../screens/leader/GroupSetupScreen';
import GroupJobOfferScreen from '../screens/leader/GroupJobOfferScreen';
import GroupQRAttendanceScreen from '../screens/leader/GroupQRAttendanceScreen';
import GroupAttendanceConfirmedScreen from '../screens/leader/GroupAttendanceConfirmedScreen';
import RateFarmerLeaderScreen from '../screens/leader/RateFarmerLeaderScreen';
import GroupWorkStatusScreen from '../screens/leader/GroupWorkStatusScreen';
import ManageGroupScreen from '../screens/leader/ManageGroupScreen';
import AddMemberScreen from '../screens/leader/AddMemberScreen';
import GroupMapScreen from '../screens/leader/GroupMapScreen';
import GroupNavigationScreen from '../screens/leader/GroupNavigationScreen';
import GroupCallScreen from '../screens/leader/GroupCallScreen';
import GroupsScreen from '../screens/leader/GroupsScreen';
import GroupDetailScreen from '../screens/leader/GroupDetailScreen';

// Shared Screens
import LiveMapDiscoveryScreen from '../screens/shared/LiveMapDiscoveryScreen';
import LiveMapCallScreen from '../screens/shared/LiveMapCallScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

// Stores
import useNotificationStore from '../store/notificationStore';

// Global Overlays
import NotificationOverlay from '../components/NotificationOverlay';

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
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
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
    <Stack.Screen name="WorkerPaymentHistory" component={WorkerPaymentHistoryScreen} />
    <Stack.Screen name="Groups" component={GroupsScreen} />
    <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
    <Stack.Screen name="LiveMapDiscovery" component={LiveMapDiscoveryScreen} />
    <Stack.Screen name="LiveMapCall" component={LiveMapCallScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
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
    <Stack.Screen name="GroupWorkStatus" component={GroupWorkStatusScreen} />
    <Stack.Screen name="ManageGroup" component={ManageGroupScreen} />
    <Stack.Screen name="Groups" component={GroupsScreen} />
    <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
    <Stack.Screen name="AddMember" component={AddMemberScreen} />
    <Stack.Screen name="GroupMap" component={GroupMapScreen} />
    <Stack.Screen name="GroupNavigation" component={GroupNavigationScreen} />
    <Stack.Screen name="GroupCall" component={GroupCallScreen} />
    <Stack.Screen name="LiveMapDiscovery" component={LiveMapDiscoveryScreen} />
    <Stack.Screen name="LiveMapCall" component={LiveMapCallScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

// ── Main Navigator ──
const AppNavigator = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state._hydrated);
  const rehydrate = useAuthStore((state) => state.rehydrate);
  
  const navigationRef = useNavigationContainerRef();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    rehydrate();
  }, []);

  // ── Register push notification token after login ──────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const registerPush = async () => {
      try {
        if (!Device.isDevice) return; // Skip in emulator

        // Push notifications don't work in Expo Go (SDK 53+) — skip gracefully
        // They will work once you build a development build or production APK
        const isExpoGo = Constants.appOwnership === 'expo';
        if (isExpoGo) {
          console.log('ℹ️ Push notifications not supported in Expo Go — skipping token registration');
          return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.warn('Push notification permission not granted');
          return;
        }
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : {}
        );
        const token = tokenData.data;
        console.log('📲 Expo Push Token:', token);
        await authAPI.updateProfile({ pushToken: token });
      } catch (err) {
        console.warn('Push token registration failed (non-fatal):', err.message);
      }
    };

    registerPush();
  }, [isAuthenticated, user?.id]);

  // ── On login: fetch any pending group invites missed while offline ──────────
  useEffect(() => {
    if (!isAuthenticated || !user?.id || user?.role !== 'worker') return;

    const loadPendingInvites = async () => {
      try {
        const res = await groupAPI.getPendingInvites();
        const invites = res?.data?.invites || [];
        invites.forEach((invite) => {
          const leaderName = invite.group?.leader?.name || 'A leader';
          const groupName = invite.group?.name || 'a group';
          useNotificationStore.getState().addNotification({
            id: `invite-${invite.id}`,   // stable id = no duplicates on re-login
            type: 'group',
            title: '\ud83e\udd1d Group Invitation',
            body: `${leaderName} invited you to join "${groupName}" — tap to accept or reject`,
            icon: 'groups',
            data: {
              screen: 'GroupDetail',
              params: { groupId: invite.group?.id, groupName },
              // carry invite id so tapping can trigger accept/reject
              inviteId: invite.id,
              groupId: invite.group?.id,
              leaderName,
              groupName,
            },
          });
        });
      } catch (e) {
        // non-fatal — user still navigates normally
        console.warn('Could not load pending invites:', e?.message);
      }
    };

    loadPendingInvites();
  }, [isAuthenticated, user?.id, user?.role]);

  // \u2500\u2500 Global socket: connect + handle real-time notifications \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    socketService.connect();
    socketService.joinUserRoom(user.id);

    // \u2500\u2500 Group invite (workers/leaders) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    const handleGroupInvite = (data) => {
      // Push to notification store so it shows in bell even if dismissed
      useNotificationStore.getState().addNotification({
        type: 'group',
        title: '🤝 Group Invitation',
        body: `${data.leaderName} invited you to join "${data.groupName}"`,
        icon: 'groups',
        data: {
          screen: 'GroupDetail',
          params: { groupId: data.groupId, groupName: data.groupName },
          // These are required so tapping the notification shows the Accept/Reject dialog
          inviteId: data.inviteId,
          groupId: data.groupId,
          leaderName: data.leaderName,
          groupName: data.groupName,
        },
      });

      Alert.alert(
        '🤝 Group Invitation',
        `${data.leaderName} invited you to join group "${data.groupName}".\n\nWould you like to join?`,
        [
          {
            text: 'Reject ❌',
            style: 'destructive',
            onPress: async () => {
              try { await groupAPI.respondToInvite(data.groupId, data.inviteId, 'reject'); }
              catch (e) { console.warn('Reject invite failed:', e.message); }
            },
          },
          {
            text: 'Accept ✅',
            onPress: async () => {
              try {
                await groupAPI.respondToInvite(data.groupId, data.inviteId, 'accept');
                Alert.alert('🎉 Joined!', `You are now a member of "${data.groupName}".`);
              } catch (e) {
                Alert.alert('Error', 'Could not accept the invite. Please try again.');
              }
            },
          },
        ],
        { cancelable: false }
      );
    };
    socketService.onGroupInvite(handleGroupInvite);

    // ── Work done (farmer ended job) → workers scan checkout QR ────
    const handleWorkDone = (data) => {
      if (user?.role === 'worker') {
        useNotificationStore.getState().addNotification({
          type: 'attendance',
          title: '🌾 Work Completed!',
          body: 'The farmer marked work as done. Scan the check-out QR.',
          icon: 'fact-check',
          data: { screen: 'QRScanner', params: { job: { id: data.jobId }, autoCheckout: true } },
        });
        Alert.alert(
          '🌾 Work Completed!',
          'The farmer has marked the work as done. Please scan the check-out QR code now.',
          [
            {
              text: 'Scan Check-Out QR',
              onPress: () => {
                navigationRef.current?.navigate('QRScanner', {
                  job: { id: data.jobId },
                  autoCheckout: true,
                });
              },
            },
          ],
          { cancelable: false }
        );
      }
    };
    socketService.onWorkDone(handleWorkDone);

    // ── Job cancelled by farmer ─────────────────────────────────────
    const handleJobCancelled = (data) => {
      useNotificationStore.getState().addNotification({
        type: 'job',
        title: '❌ Job Cancelled',
        body: `A farmer cancelled the job: ${data.workType || 'Farm Work'}`,
        icon: 'cancel',
        data: null,
      });
    };
    socketService.onJobCancelled(handleJobCancelled);

    // ── New job offer pushed to worker ──────────────────────────────
    const handleNewOfferNotif = (offer) => {
      useNotificationStore.getState().addNotification({
        type: 'job',
        title: '🌾 New Job Offer!',
        body: `${offer.workType || 'Farm Work'} • ₹${offer.payPerDay}/day • ${offer.distanceLabel || 'Nearby'}`,
        icon: 'work',
        data: { screen: 'JobOffer', params: { job: { ...offer, id: offer.jobId } } },
      });
    };
    socketService.onNewOffer(handleNewOfferNotif);

    return () => {
      socketService.offGroupInvite(handleGroupInvite);
      socketService.offWorkDone(handleWorkDone);
      socketService.offJobCancelled(handleJobCancelled);
      socketService.offNewOffer(handleNewOfferNotif);
    };
  }, [isAuthenticated, user?.id, user?.role]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F4F0' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['left', 'right', 'bottom']}>
      <NavigationContainer 
        ref={navigationRef} 
        onStateChange={() => {
          setCanGoBack(navigationRef.canGoBack());
        }}
      >
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

      <NotificationOverlay />
    </SafeAreaView>
  );
};

export default AppNavigator;

