/**
 * WorkerHomeScreen
 * M1 REFACTOR: Reduced from 732 lines / 25KB to ~200 lines by extracting:
 *   - JobOfferBanner   → components/worker/JobOfferBanner.js
 *   - QuickActions     → components/worker/QuickActions.js
 *   - WorkHistory      → components/worker/WorkHistory.js  (includes JobCard + historyStyles)
 *
 * This file is now a pure orchestration shell: it owns state and data fetching,
 * and delegates all rendering to the sub-components above.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, Alert, ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';
import EmptyState from '../../components/EmptyState';
import MapDashboard from '../../components/MapDashboard';
import FloatingGroupIcon from '../../components/FloatingGroupIcon';
import { jobAPI, authAPI } from '../../services/api';
import { socketService } from '../../services/socketService';

// M1: Extracted sub-components
import JobOfferBanner from '../../components/worker/JobOfferBanner';
import QuickActions   from '../../components/worker/QuickActions';
import WorkHistory    from '../../components/worker/WorkHistory';

// ── WorkerHomeScreen ───────────────────────────────────────────────────────────

const WorkerHomeScreen = ({ navigation, route }) => {
  const { user, logout, refreshProfile } = useAuthStore();
  const { t } = useTranslation();
  const [isOnline, setIsOnline]         = useState(true);
  const [searching, setSearching]        = useState(false);
  const [jobsMap, setJobsMap]            = useState({});
  const [jobFetchError, setJobFetchError] = useState(false);
  const [pendingOffer, setPendingOffer]   = useState(null);
  const [refreshing, setRefreshing]      = useState(false); // M6

  // History state (owned here, passed into WorkHistory as props)
  const [historyJobs, setHistoryJobs]       = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const activeTab = route.params?.tab || 'home';
  const navigationRef = useRef(navigation);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchNearbyJobs = useCallback(async () => {
    try {
      setJobFetchError(false);
      const response = await jobAPI.getJobs({ status: 'pending' });
      const jobList  = response?.data?.data || [];
      const newMap   = {};
      jobList.forEach(j => {
        newMap[j.id] = {
          id: j.id,
          latitude:    j.farmLatitude  || 17.3850,
          longitude:   j.farmLongitude || 78.4867,
          type:        'job',
          title:       j.workType || 'Farm Job',
          workType:    j.workType,
          payPerDay:   j.payPerDay,
          farmAddress: j.farmAddress,
        };
      });
      setJobsMap(newMap);
      const latest = jobList.find(j => j.workerType !== 'group');
      if (latest && !pendingOffer) {
        setPendingOffer({ ...latest });
      }
    } catch {
      setJobFetchError(true);
    }
  }, [pendingOffer]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res  = await jobAPI.getWorkerJobs();
      const all  = res?.data?.data || [];
      setHistoryJobs(
        all
          .filter(j => ['accepted', 'in_progress', 'completed', 'cancelled'].includes(j.status))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      );
    } catch {
      try {
        const res2 = await jobAPI.getWorkerHistory();
        const all2 = res2?.data?.data || [];
        setHistoryJobs(all2.sort((a, b) => new Date(b.checkIn || b.createdAt) - new Date(a.checkIn || a.createdAt)));
      } catch (e2) {
        console.warn('Failed to fetch work history', e2);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ── Effects ──────────────────────────────────────────────────────────────────

  // Refresh profile + jobs + GPS on every screen focus
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      fetchNearbyJobs();
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
            await authAPI.updateProfile({
              latitude:  loc.coords.latitude,
              longitude: loc.coords.longitude,
              status:    'available',
            });
          }
        } catch (gpsErr) {
          console.warn('GPS save failed:', gpsErr.message);
        }
      })();
    }, [fetchNearbyJobs, refreshProfile])
  );

  // Fetch history when history tab is active
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'history') fetchHistory();
    }, [activeTab, fetchHistory])
  );

  // Socket: real-time job offer & job-taken events
  useEffect(() => {
    if (user?.id) {
      socketService.connect();
      socketService.joinUserRoom(user.id);
    }

    const handleJobTaken = ({ jobId }) => {
      setJobsMap(prev => { const u = { ...prev }; delete u[jobId]; return u; });
    };

    const handleNewOffer = (offer) => {
      const farmLat = offer.farmLatitude  ?? offer.latitude  ?? 17.3850;
      const farmLng = offer.farmLongitude ?? offer.longitude ?? 78.4867;
      setJobsMap(prev => ({
        ...prev,
        [offer.jobId]: {
          id: offer.jobId, latitude: farmLat, longitude: farmLng,
          type: 'job', title: offer.workType || 'Farm Job',
          workType: offer.workType, payPerDay: offer.payPerDay, farmAddress: offer.farmAddress,
          farmLatitude: farmLat, farmLongitude: farmLng,
        },
      }));
      setPendingOffer({ ...offer });
      const label = offer.reOpened ? '🔄 Job Available Again!' : '🌾 New Job Offer!';
      Alert.alert(
        label,
        `Work Type: ${offer.workType}\n💰 ₹${offer.payPerDay}/day\n📍 ${offer.distanceLabel || 'Nearby'}`,
        [
          { text: 'Ignore', style: 'cancel' },
          { text: 'View Offer', onPress: () => navigationRef.current.navigate('JobOffer', { job: { ...offer, id: offer.jobId } }) },
        ]
      );
    };

    socketService.onJobTaken(handleJobTaken);
    socketService.onNewOffer(handleNewOffer);
    return () => { socketService.offJobTaken(); socketService.offNewOffer(); };
  }, [user?.id]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleStartWork = async () => {
    setSearching(true);
    try {
      const response = await jobAPI.getJobs({ status: 'pending' });
      const jobs = response?.data?.data || [];
      if (jobs.length === 0) {
        Alert.alert('No Jobs', 'No pending jobs found near you. Please try again later.');
        return;
      }
      navigation.navigate('JobOffer', { job: jobs[0] });
    } catch {
      Alert.alert('Error', 'Could not fetch jobs. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleJobOffers = () => {
    if (pendingOffer) {
      navigation.navigate('JobOffer', { job: { ...pendingOffer, id: pendingOffer.jobId || pendingOffer.id } });
    } else {
      handleStartWork();
    }
  };

  const handleHelp = () => {
    Alert.alert('Help / సహాయం', '📞 Support: +91 1800-123-456', [{ text: 'OK' }]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={['#FDFBF7', colors.backgroundLight]} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      <TopBar title={t('worker.workerHome')} navigation={navigation} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([fetchNearbyJobs(), fetchHistory()]);
              setRefreshing(false);
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >

        {/* Network error */}
        {jobFetchError && (
          <EmptyState
            offline
            title="Can't reach server"
            subtitle="Check your connection. Backend might not be running."
            action={{ label: 'Retry', onPress: fetchNearbyJobs }}
            style={{ paddingVertical: 24 }}
          />
        )}

        {/* M1: Job offer banner — now its own component */}
        <JobOfferBanner
          offer={pendingOffer}
          onView={handleJobOffers}
          onDismiss={() => setPendingOffer(null)}
        />

<<<<<<< HEAD
        {/* Greeting */}
=======
        {/* Rapido-style Map for Workers */}
        <View style={styles.mapWrap}>
          <MapDashboard
            markers={jobs}
            userLocation={userLocation}
            height={280}
            onMarkerPress={(job) => navigation.navigate('JobOffer', { job })}
          />
          <View style={styles.mapOverlay}>
            <View style={styles.statusBadgeWrap}>
              <View style={[styles.onlineStatusBadge, { backgroundColor: isOnline ? colors.primary : '#9CA3AF' }]}>
                <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#FFF' : '#666' }]} />
                <Text style={styles.onlineLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Profile Header */}
>>>>>>> 74e51c4318c9ff40b9055c626457f54d7b3872f1
        <View style={styles.profileHeader}>
          <Text style={styles.greetingText}>
            {t('common.namaste')}, {user?.name || t('common.worker')}
          </Text>
          <Text style={styles.subText}>{t('worker.readyToEarn')}</Text>
        </View>

        <View style={{ height: 16 }} />

        {/* START WORK button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.startBtnTouchable, (!isOnline || searching) && { opacity: 0.7 }]}
            activeOpacity={0.9}
            onPress={handleStartWork}
            disabled={!isOnline || searching}
          >
            <LinearGradient
              colors={isOnline && !searching ? colors.primaryGradient : ['#9CA3AF', '#6B7280']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.startButton}
            >
              {searching ? (
                <>
                  <ActivityIndicator color={colors.white} size="large" />
                  <Text style={styles.startButtonText} adjustsFontSizeToFit numberOfLines={1}>
                    {t('worker.searching')}
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="play-arrow" size={72} color={colors.white} />
                  <Text style={styles.startButtonText} adjustsFontSizeToFit numberOfLines={1}>
                    {t('worker.startWork')}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* M1: Quick action grid — now its own component */}
        <QuickActions
          navigation={navigation}
          pendingOffer={pendingOffer}
          onJobOffers={handleJobOffers}
          onHelp={handleHelp}
        />

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={22} color="#EF4444" />
          <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* M1: Work history overlay — now its own component */}
      {activeTab === 'history' && (
        <WorkHistory
          jobs={historyJobs}
          loading={historyLoading}
          navigation={navigation}
          onClose={() => navigation.setParams({ tab: 'home' })}
          onRefresh={fetchHistory}
        />
      )}

<<<<<<< HEAD
=======
      {activeTab !== 'history' && <FloatingGroupIcon />}
      {/* Bottom Navigation */}
>>>>>>> 74e51c4318c9ff40b9055c626457f54d7b3872f1
      <BottomNavBar role="worker" activeTab={activeTab === 'history' ? 'History' : 'Home'} />
    </LinearGradient>
  );
};

<<<<<<< HEAD
// ── Styles ─────────────────────────────────────────────────────────────────────
=======
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  mapWrap: {
    height: 280,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mapOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  statusBadgeWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  onlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  profileHeader: {
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#131811',
    textAlign: 'center',
  },
  subText: {
    fontSize: 18,
    color: '#6f8961',
    marginTop: 4,
    textAlign: 'center',
  },
  voicePrompt: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 8,
    alignItems: 'center',
  },
  voicePromptInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  voicePromptText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131811',
  },
  voiceHint: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6f8961',
    letterSpacing: 2,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  startButton: {
    width: 260,
    height: 260,
    borderRadius: 130,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 25,
    borderWidth: 10,
    borderColor: '#FFFFFF',
  },
  startBtnTouchable: {
    borderRadius: 130,
  },
  startButtonText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
    letterSpacing: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  actionCard: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIconCircle: {
    backgroundColor: '#F2F4F0',
    padding: 16,
    borderRadius: 9999,
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131811',
  },
  logoutButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  offerBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 16, overflow: 'hidden', elevation: 4 },
  offerBannerGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderWidth: 1.5, borderColor: '#FCD34D', borderRadius: 16 },
  offerBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  offerBannerTitle: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  offerBannerSub: { fontSize: 12, color: '#B45309', marginTop: 1 },
  offerBannerBtn: { backgroundColor: '#D97706', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginLeft: 8 },
  offerBannerBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  offerDot: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  offerDotText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
});
>>>>>>> 74e51c4318c9ff40b9055c626457f54d7b3872f1

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.backgroundLight },
  content:          { flex: 1 },
  contentContainer: { paddingBottom: 120 },
  profileHeader:    { padding: 16, marginTop: 16, alignItems: 'center' },
  greetingText:     { fontSize: 28, fontWeight: 'bold', color: '#131811', textAlign: 'center' },
  subText:          { fontSize: 18, color: '#6f8961', marginTop: 4, textAlign: 'center' },
  buttonContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
  startButton: {
    width: 260, height: 260, borderRadius: 130,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4, shadowRadius: 40, elevation: 25,
    borderWidth: 10, borderColor: '#FFFFFF',
  },
  startBtnTouchable: { borderRadius: 130 },
  startButtonText:   { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginTop: 8, letterSpacing: 1 },
  logoutButton: {
    flexDirection: 'row', height: 52, backgroundColor: '#FEF2F2',
    marginHorizontal: 16, marginTop: 24, borderRadius: 9999,
    justifyContent: 'center', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#FECACA',
  },
  logoutButtonText: { fontSize: 16, fontWeight: 'bold', color: '#EF4444' },
});

export default WorkerHomeScreen;
