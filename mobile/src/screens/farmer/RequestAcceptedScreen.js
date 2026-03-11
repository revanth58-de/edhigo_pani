// Screen 10: Request Accepted — Rapido-style full-screen map with bottom worker card
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Alert,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { socketService } from '../../services/socketService';
import { jobService } from '../../services/api/jobService';
import MapDashboard from '../../components/MapDashboard';
import BottomNavBar from '../../components/BottomNavBar';

const RequestAcceptedScreen = ({ navigation, route }) => {
  const { job } = route.params;
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();

  const [workers, setWorkers] = useState([]);   // all accepted workers
  const [eta, setEta] = useState('~10 min');
  const [workerLocations, setWorkerLocations] = useState([]);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animate sheet up on mount
  useEffect(() => {
    Animated.spring(sheetAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
    // Pulse for the green verified dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    fetchJobDetails();

    socketService.connect();
    if (job?.id) socketService.joinJobRoom(job.id);

    socketService.socket?.on('job:arrival', (data) => {
      if (data.jobId === job?.id) navigation.navigate('ArrivalAlert', { job });
    });

    socketService.onLocationUpdate((data) => {
      if (data.jobId === job?.id || data.workerId) {
        if (data.eta) setEta(data.eta);
        setWorkerLocations(prev => {
          const filtered = prev.filter(w => w.id !== (data.userId || data.workerId));
          return [...filtered, {
            id: data.userId || data.workerId,
            latitude: data.latitude,
            longitude: data.longitude,
            type: 'worker',
            active: true,
          }];
        });
      }
    });

    return () => {
      socketService.socket?.off('job:arrival');
      socketService.offLocationUpdate();
    };
  }, [job?.id]);

  const fetchJobDetails = async () => {
    if (!job?.id) return;
    try {
      const response = await jobService.getJob(job.id);
      if (response.success && response.data?.data) {
        const jobData = response.data.data;
        const accepted = (jobData.applications || [])
          .filter(a => a.status === 'accepted')
          .map(a => ({
            id: a.worker?.id || a.workerId,
            name: a.worker?.name || 'Worker',
            rating: a.worker?.ratingAvg || 0,
            phone: a.worker?.phone || null,
            skills: a.worker?.skills || null,
            village: a.worker?.village || null,
          }));
        if (accepted.length > 0) setWorkers(accepted);
      }
    } catch (_) {}
  };

  const handleCallWorker = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Info', 'Phone number not available yet.');
    }
  };

  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Job?',
      'This will cancel the job and remove all workers. Are you sure?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try { if (job?.id) await jobService.cancelJob(job.id); } catch (_) {}
            navigation.navigate('FarmerHome');
          },
        },
      ]
    );
  };

  const payPerDay = job?.payPerDay || 500;
  const workersNeeded = job?.workersNeeded || 1;
  const workType = job?.workType
    ? job.workType.charAt(0).toUpperCase() + job.workType.slice(1)
    : 'Labour';

  // Map markers: accepted workers' locations
  const mapMarkers = workerLocations.length > 0
    ? workerLocations
    : workers.slice(0, 1).map(w => ({
        id: w.id,
        latitude: 17.3850 + (Math.random() - 0.5) * 0.01,
        longitude: 78.4867 + (Math.random() - 0.5) * 0.01,
        type: 'worker',
        active: true,
      }));

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Full-Screen Map ── */}
      <MapDashboard
        fullScreen
        markers={mapMarkers}
        userLocation={
          job?.farmLatitude && job?.farmLongitude
            ? { latitude: job.farmLatitude, longitude: job.farmLongitude }
            : null
        }
      />

      {/* ── Top Status Pill ── */}
      <View style={styles.topPill}>
        <Animated.View style={[styles.pillDot, { transform: [{ scale: pulseAnim }] }]} />
        <Text style={styles.pillText}>
          {workers.length > 0
            ? `${workers.length}/${workersNeeded} Workers on the way`
            : 'Workers confirmed'}
        </Text>
      </View>

      {/* ── Back Button ── */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={22} color="#131811" />
      </TouchableOpacity>

      {/* ── Animated Bottom Sheet ── */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetTranslateY }] }]}>
        <View style={styles.dragHandle} />

        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.jobIconWrap}>
            <MaterialIcons name="agriculture" size={26} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{workType} Work</Text>
            <Text style={styles.headerSub}>
              {workers.length}/{workersNeeded} workers • ₹{payPerDay}/day
            </Text>
          </View>
          <View style={styles.etaBadge}>
            <MaterialIcons name="schedule" size={14} color="#F59E0B" />
            <Text style={styles.etaText}>{eta}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Workers list */}
        {workers.length === 0 ? (
          <View style={styles.noWorkerRow}>
            <MaterialIcons name="people" size={24} color="#9CA3AF" />
            <Text style={styles.noWorkerText}>Loading worker details…</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 180 }}>
            {workers.map((w, idx) => (
              <View key={w.id || idx} style={styles.workerRow}>
                {/* Avatar */}
                <View style={styles.workerAvatar}>
                  <MaterialIcons name="person" size={22} color={colors.primary} />
                </View>
                {/* Info */}
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{w.name}</Text>
                  <View style={styles.workerMeta}>
                    <MaterialIcons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.workerRating}>{w.rating ? w.rating.toFixed(1) : '—'}</Text>
                    {w.village ? <Text style={styles.workerVillage}> • {w.village}</Text> : null}
                  </View>
                </View>
                {/* Call */}
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCallWorker(w.phone)}
                >
                  <MaterialIcons name="phone" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.divider} />

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelRequest}>
            <MaterialIcons name="close" size={18} color="#EF4444" />
            <Text style={styles.cancelText}>Cancel Job</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.callAllBtn}
            onPress={() => {
              const first = workers.find(w => w.phone);
              if (first) handleCallWorker(first.phone);
              else Alert.alert('Info', 'Worker phone numbers not available yet.');
            }}
          >
            <LinearGradient colors={colors.primaryGradient} style={styles.callAllGrad}>
              <MaterialIcons name="phone" size={18} color="#FFFFFF" />
              <Text style={styles.callAllText}>Call Worker</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <BottomNavBar role="farmer" activeTab="Discovery" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Top pill
  topPill: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 56,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#131811',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  pillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Back button
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 56,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  jobIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#131811' },
  headerSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  etaText: { fontSize: 13, fontWeight: '700', color: '#D97706' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

  // No worker placeholder
  noWorkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  noWorkerText: { fontSize: 14, color: '#9CA3AF' },

  // Worker row
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  workerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${colors.primary}33`,
  },
  workerInfo: { flex: 1 },
  workerName: { fontSize: 15, fontWeight: '700', color: '#131811' },
  workerMeta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  workerRating: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  workerVillage: { fontSize: 12, color: '#9CA3AF' },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  callAllBtn: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  callAllGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  callAllText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});

export default RequestAcceptedScreen;
