// Screen 17: Worker Home - Fixed and Refactored
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';
import MapDashboard from '../../components/MapDashboard';
import { jobAPI } from '../../services/api';
import { socketService } from '../../services/socketService';

const STATUS_META = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7', icon: 'schedule' },
  accepted: { label: 'Accepted', color: '#3B82F6', bg: '#EFF6FF', icon: 'check-circle' },
  in_progress: { label: 'In Progress', color: '#8B5CF6', bg: '#F5F3FF', icon: 'play-circle' },
  completed: { label: 'Completed', color: '#10B981', bg: '#D1FAE5', icon: 'task-alt' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2', icon: 'cancel' },
};

const WORK_ICONS = {
  Sowing: 'grass',
  Harvesting: 'agriculture',
  Irrigation: 'water-drop',
  Labour: 'engineering',
  Tractor: 'agriculture',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const JobCard = ({ job }) => {
  const status = STATUS_META[job.status] || STATUS_META.completed; // Default to completed for history
  const workIcon = WORK_ICONS[job.workType] || 'work';

  return (
    <View style={historyStyles.card}>
      <View style={historyStyles.cardHeader}>
        <View style={[historyStyles.workIconCircle, { backgroundColor: `${colors.primary}15` }]}>
          <MaterialIcons name={workIcon} size={28} color={colors.primary} />
        </View>
        <View style={historyStyles.cardHeaderText}>
          <Text style={historyStyles.workType}>{job.workType || 'Farm Work'}</Text>
          <Text style={historyStyles.jobDate}>{formatDate(job.createdAt)}</Text>
        </View>
        <View style={[historyStyles.statusBadge, { backgroundColor: status.bg }]}>
          <MaterialIcons name={status.icon} size={14} color={status.color} />
          <Text style={[historyStyles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={historyStyles.cardDetails}>
        <View style={historyStyles.detailRow}>
          <MaterialIcons name="location-on" size={16} color="#9CA3AF" />
          <Text style={historyStyles.detailText}>{job.village || 'Location'}</Text>
        </View>
        <View style={historyStyles.detailRow}>
          <MaterialIcons name="currency-rupee" size={16} color="#9CA3AF" />
          <Text style={historyStyles.detailText}>₹{job.wagePerDay || job.payPerDay || '500'}</Text>
        </View>
      </View>
    </View>
  );
};

const WorkerHomeScreen = ({ navigation, route }) => {
  const { user, logout } = useAuthStore();
  const [isOnline, setIsOnline] = useState(true);
  const [searching, setSearching] = useState(false);
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';
  // Store jobs as id-keyed map for O(1) removal when job:taken fires
  const [jobsMap, setJobsMap] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const activeTab = route.params?.tab || 'home';
  const navigationRef = useRef(navigation);

  // Derived array for MapDashboard
  const jobs = Object.values(jobsMap);

  const fetchNearbyJobs = useCallback(async () => {
    try {
      const response = await jobAPI.getJobs({ status: 'pending' });
      const jobList = response?.data?.data || [];
      const newMap = {};
      jobList.forEach(j => {
        newMap[j.id] = {
          id: j.id,
          latitude: j.farmLatitude || 17.3850,
          longitude: j.farmLongitude || 78.4867,
          type: 'job',
          title: j.workType || 'Farm Job',
          workType: j.workType,
          payPerDay: j.payPerDay,
          farmAddress: j.farmAddress,
        };
      });
      setJobsMap(newMap);
    } catch (e) {
      console.warn('Failed to fetch jobs for map');
    }
  }, []);

  useEffect(() => {
    fetchNearbyJobs();

    // Join personal socket room so backend can send targeted job offers
    if (user?.id) {
      socketService.connect();
      socketService.joinUserRoom(user.id);
    }

    // ── Real-time: job taken by another worker → remove from feed ───
    const handleJobTaken = ({ jobId }) => {
      setJobsMap(prev => {
        const updated = { ...prev };
        delete updated[jobId];
        return updated;
      });
    };

    // ── Real-time: new job offer or re-opened job → add to feed ──────
    const handleNewOffer = (offer) => {
      const distanceText = offer.distanceLabel || 'Nearby';

      // Add/restore the job in the map feed immediately
      setJobsMap(prev => ({
        ...prev,
        [offer.jobId]: {
          id: offer.jobId,
          latitude: 17.3850, // will update if server sends coords
          longitude: 78.4867,
          type: 'job',
          title: offer.workType || 'Farm Job',
          workType: offer.workType,
          payPerDay: offer.payPerDay,
          farmAddress: offer.farmAddress,
        },
      }));

      // Show alert to prompt worker
      const label = offer.reOpened ? '🔄 Job Available Again!' : '🌾 New Job Offer!';
      Alert.alert(
        label,
        `Work Type: ${offer.workType}\n💰 ₹${offer.payPerDay}/day\n📍 ${distanceText}`,
        [
          { text: 'Ignore', style: 'cancel' },
          {
            text: 'View Offer',
            onPress: () => navigationRef.current.navigate('JobOffer', { job: { ...offer, id: offer.jobId } }),
          },
        ]
      );
    };

    socketService.onJobTaken(handleJobTaken);
    socketService.onNewOffer(handleNewOffer);

    return () => {
      socketService.offJobTaken();
      socketService.offNewOffer();
    };
  }, [user?.id, fetchNearbyJobs]);

  useEffect(() => {
    // Voice guidance removed
  }, []);

  const handleStartWork = async () => {
    setSearching(true);
    // Voice guidance removed
    try {
      const response = await jobAPI.getJobs({ status: 'pending' });
      const jobs = response?.data?.data || [];
      if (jobs.length === 0) {
        // Voice guidance removed
        Alert.alert('No Jobs', 'No pending jobs found near you. Please try again later.');
        return;
      }
      // Take the first available pending job
      const job = jobs[0];
      // Voice guidance removed
      navigation.navigate('JobOffer', { job });
    } catch (error) {
      console.error('Fetch jobs error:', error);
      Alert.alert('Error', 'Could not fetch jobs. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const toggleOnlineStatus = (value) => {
    setIsOnline(value);
    // Voice guidance removed
  };

  const handleHelp = () => {
    const phoneNumber = '+911800123456';
    if (Platform.OS === 'web') {
      window.alert('📞 Support: +91 1800-123-456');
    } else {
      Alert.alert(
        'Help / సహాయం',
        '📞 Support: +91 1800-123-456',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Bar */}
      <TopBar title={t('worker.workerHome')} navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Rapido-style Map for Workers */}
        <View style={styles.mapWrap}>
          <MapDashboard
            markers={jobs}
            userLocation={userLocation}
            height={280}
            onMarkerPress={(job) => navigation.navigate('JobOffer', { job })}
          />
          <View style={styles.mapOverlay}>
            <View style={[styles.onlineStatusBadge, { backgroundColor: isOnline ? colors.primary : '#9CA3AF' }]}>
              <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#fff' : '#666' }]} />
              <Text style={styles.onlineLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Text style={styles.greetingText}>
            {t('common.namaste')}, {user?.name || t('common.worker')}
          </Text>
          <Text style={styles.subText}>{t('worker.readyToEarn')}</Text>
        </View>

        <View style={{ height: 40 }} />

        {/* Massive START WORK Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.startButton, (!isOnline || searching) && { opacity: 0.7 }]}
            activeOpacity={0.9}
            onPress={handleStartWork}
            disabled={!isOnline || searching}
          >
            {searching ? (
              <>
                <ActivityIndicator color={colors.backgroundDark} size="large" />
                <Text
                  style={styles.startButtonText}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {t('worker.searching')}
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons name="play-arrow" size={72} color={colors.backgroundDark} />
                <Text
                  style={styles.startButtonText}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {t('worker.startWork')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionCard} onPress={handleHelp}>
            <View style={styles.actionIconCircle}>
              <MaterialIcons name="support-agent" size={30} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>{t('worker.help')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('QRScanner', { role: 'worker' })}
          >
            <View style={styles.actionIconCircle}>
              <MaterialIcons name="qr-code-scanner" size={30} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>{t('qr.scanQR')}</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            if (Platform.OS === 'web') {
              if (typeof window !== 'undefined' && window.confirm('Are you sure you want to logout?')) {
                logout();
              }
            } else {
              Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => logout(),
                  },
                ]
              );
            }
          }}
        >
          <MaterialIcons name="logout" size={22} color="#EF4444" />
          <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* History Overlay */}
      {activeTab === 'history' && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#F9FAFB', zIndex: 100 }]}>
          <TopBar title="Work History" showBack navigation={navigation} onHelp={() => navigation.setParams({ tab: 'home' })} />
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
            <View style={historyStyles.summaryRow}>
              <Text style={historyStyles.summaryText}>Your recent work history</Text>
            </View>

            <JobCard job={{ workType: 'Harvesting', createdAt: new Date().toISOString(), status: 'completed', village: 'Gachibowli', payPerDay: 500 }} />
            <JobCard job={{ workType: 'Sowing', createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'completed', village: 'Kondapur', payPerDay: 450 }} />
            <JobCard job={{ workType: 'Irrigation', createdAt: new Date(Date.now() - 172800000).toISOString(), status: 'completed', village: 'Madhapur', payPerDay: 400 }} />

            <TouchableOpacity
              style={historyStyles.closeBtn}
              onPress={() => navigation.setParams({ tab: 'home' })}
            >
              <Text style={historyStyles.closeBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Bottom Navigation */}
      <BottomNavBar role="worker" activeTab={activeTab === 'history' ? 'History' : 'Home'} />
    </View>
  );
};

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
  onlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
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
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 8,
    borderColor: '#FFFFFF',
  },
  startButtonText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.backgroundDark,
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 16,
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
});

const historyStyles = StyleSheet.create({
  summaryRow: { marginBottom: 16 },
  summaryText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  workIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardHeaderText: { flex: 1 },
  workType: { fontSize: 16, fontWeight: '700', color: '#131811' },
  jobDate: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDetails: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#6B7280' },
  closeBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default WorkerHomeScreen;
