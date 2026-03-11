// Screen 9: Request Sent — Rapido-style Finding Workers screen
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { socketService } from '../../services/socketService';
import { jobAPI } from '../../services/api';
import MapDashboard from '../../components/MapDashboard';

const RequestSentScreen = ({ navigation, route }) => {
  const { job } = route.params;
  const { user } = useAuthStore();
  const { t } = useTranslation();

  // Slot tracking state
  const [acceptedCount, setAcceptedCount] = useState(0);
  const workersNeeded = job?.workersNeeded || 1;

  // Animated values for Rapido-style pulse
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  // Polling ref so we can clear it
  const pollRef = useRef(null);
  const hasNavigated = useRef(false);

  const navigateToAccepted = useCallback((data) => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    if (pollRef.current) clearInterval(pollRef.current);
    navigation.replace('RequestAccepted', { job: { ...job, ...data } });
  }, [navigation, job]);

  // ── Pulse animation ──────────────────────────────────────────────────────
  useEffect(() => {
    const createPulse = (value, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    const p1 = createPulse(pulse1, 0);
    const p2 = createPulse(pulse2, 600);
    const p3 = createPulse(pulse3, 1200);
    p1.start(); p2.start(); p3.start();

    // Spin animation for the search icon
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // Dot bounce for status text
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    return () => { p1.stop(); p2.stop(); p3.stop(); };
  }, []);

  // ── Socket + Polling for acceptance ──────────────────────────────────────
  useEffect(() => {
    socketService.connect();
    if (user?.id) socketService.joinUserRoom(user.id);
    if (job?.id) socketService.joinJobRoom(job.id);

    const handleJobAccepted = (data) => {
      if (data.jobId !== job?.id) return;

      const newCount = data.acceptedCount ?? 1;
      const needed = data.workersNeeded ?? workersNeeded;
      setAcceptedCount(newCount);

      if (data.isFullyStaffed) {
        navigateToAccepted(data);
      }
      // else: UI updates the slot counter, stays on this screen
    };

    socketService.onJobAccepted(handleJobAccepted);

    // ── Polling fallback (in case socket misses the event) ───────────────
    // Every 4 seconds, check if the job is now fully staffed
    pollRef.current = setInterval(async () => {
      if (hasNavigated.current) return;
      try {
        const res = await jobAPI.getJob(job.id);
        const jobData = res?.data?.data;
        if (!jobData) return;

        // Count accepted applications
        const accepted = (jobData.applications || []).filter(a => a.status === 'accepted');
        setAcceptedCount(accepted.length);

        if (jobData.status === 'accepted' || accepted.length >= (jobData.workersNeeded || 1)) {
          navigateToAccepted({ ...jobData, isFullyStaffed: true });
        }
      } catch (_) { /* non-fatal */ }
    }, 4000);

    return () => {
      socketService.offJobAccepted(handleJobAccepted);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [job?.id, user?.id]);

  // ── Block hardware back — farmer must explicitly cancel ───────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Job Request',
      'Are you sure you want to cancel finding workers?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            hasNavigated.current = true;
            if (pollRef.current) clearInterval(pollRef.current);
            try { if (job?.id) await jobAPI.cancelJob(job.id); } catch (_) {}
            navigation.navigate('FarmerHome');
          },
        },
      ]
    );
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const workTypeDisplay = job?.workType
    ? job.workType.charAt(0).toUpperCase() + job.workType.slice(1)
    : 'Labour';

  const slots = Array.from({ length: workersNeeded }, (_, i) => i < acceptedCount);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Full-screen Map (Rapido-style background) ── */}
      <MapDashboard
        fullScreen
        markers={[]}
        userLocation={
          job?.farmLatitude && job?.farmLongitude
            ? { latitude: job.farmLatitude, longitude: job.farmLongitude }
            : null
        }
      />
      {/* Dim overlay so bottom sheet reads well */}
      <View style={styles.mapDim} pointerEvents="none" />

      {/* ── Top Status Bar (like Rapido's black pill) ── */}
      <View style={styles.topPill}>
        <View style={styles.topPillDot} />
        <Text style={styles.topPillText}>
          {acceptedCount === 0 ? 'Searching for workers…' : `${acceptedCount}/${workersNeeded} workers confirmed`}
        </Text>
      </View>

      {/* ── Pulse Animation (centre of map) ── */}
      <View style={styles.pulseWrap} pointerEvents="none">
        <Animated.View style={[styles.pulseRing, styles.ring3, {
          opacity: pulse3,
          transform: [{ scale: pulse3.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.3] }) }],
        }]} />
        <Animated.View style={[styles.pulseRing, styles.ring2, {
          opacity: pulse2,
          transform: [{ scale: pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) }],
        }]} />
        <Animated.View style={[styles.pulseRing, styles.ring1, { opacity: pulse1 }]} />
        <View style={styles.pulseCenter}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <MaterialIcons name="person-search" size={36} color="#FFFFFF" />
          </Animated.View>
        </View>
      </View>

      {/* ── Bottom Sheet (Rapido-style card) ── */}
      <View style={styles.bottomSheet}>

        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Job title row */}
        <View style={styles.jobRow}>
          <View style={styles.jobIconWrap}>
            <MaterialIcons name="agriculture" size={28} color={colors.primary} />
          </View>
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle}>{workTypeDisplay} Work</Text>
            <Text style={styles.jobSub}>{job?.farmAddress || 'Your farm'}</Text>
          </View>
          <View style={styles.payBadge}>
            <Text style={styles.payText}>₹{job?.payPerDay || 500}</Text>
            <Text style={styles.payLabel}>/day</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Worker slots — Rapido-style dot indicators */}
        <View style={styles.slotsRow}>
          <View style={styles.slotsLeft}>
            <Text style={styles.slotsLabel}>Workers</Text>
            <View style={styles.slotDots}>
              {slots.map((filled, i) => (
                <View
                  key={i}
                  style={[styles.slotDot, filled ? styles.slotDotFilled : styles.slotDotEmpty]}
                />
              ))}
            </View>
          </View>
          <Text style={styles.slotsCount}>
            <Text style={styles.slotsAccepted}>{acceptedCount}</Text>
            <Text style={styles.slotsOf}>/{workersNeeded}</Text>
          </Text>
        </View>

        {/* Status indicator */}
        <View style={styles.statusRow}>
          <View style={styles.statusDotAnimWrap}>
            <Animated.View style={[styles.statusDotLive, {
              opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            }]} />
          </View>
          <Text style={styles.statusText}>
            {acceptedCount === 0
              ? 'Finding available workers nearby…'
              : acceptedCount < workersNeeded
                ? `${workersNeeded - acceptedCount} more worker${workersNeeded - acceptedCount !== 1 ? 's' : ''} needed`
                : '✅ All workers confirmed! Loading details…'}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Estimated wait */}
        <View style={styles.etaRow}>
          <MaterialIcons name="schedule" size={18} color="#9CA3AF" />
          <Text style={styles.etaText}>Estimated wait: 2–5 minutes</Text>
        </View>

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
          <MaterialIcons name="close" size={18} color="#EF4444" />
          <Text style={styles.cancelText}>Cancel Search</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // Map
  mapContainer: { ...StyleSheet.absoluteFillObject },
  mapDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },

  // Top pill (like Rapido's status bar)
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
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  topPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  topPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Pulse
  pulseWrap: {
    position: 'absolute',
    top: '28%',
    alignSelf: 'center',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 999,
  },
  ring3: {
    width: 200, height: 200,
    borderWidth: 2,
    borderColor: `${colors.primary}50`,
    backgroundColor: 'transparent',
  },
  ring2: {
    width: 150, height: 150,
    borderWidth: 2,
    borderColor: `${colors.primary}80`,
    backgroundColor: `${colors.primary}15`,
  },
  ring1: {
    width: 100, height: 100,
    backgroundColor: `${colors.primary}25`,
  },
  pulseCenter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },

  // Job row
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  jobIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobInfo: { flex: 1 },
  jobTitle: { fontSize: 18, fontWeight: '800', color: '#131811' },
  jobSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  payBadge: { alignItems: 'flex-end' },
  payText: { fontSize: 22, fontWeight: '900', color: colors.primary },
  payLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },

  // Slots
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  slotsLeft: { flex: 1 },
  slotsLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8 },
  slotDots: { flexDirection: 'row', gap: 6 },
  slotDot: { width: 28, height: 8, borderRadius: 4 },
  slotDotFilled: { backgroundColor: colors.primary },
  slotDotEmpty: { backgroundColor: '#E5E7EB' },
  slotsCount: { fontSize: 28, fontWeight: '900' },
  slotsAccepted: { color: colors.primary },
  slotsOf: { color: '#D1D5DB' },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  statusDotAnimWrap: { width: 10, height: 10, justifyContent: 'center', alignItems: 'center' },
  statusDotLive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  statusText: { fontSize: 14, color: '#6B7280', flex: 1, fontWeight: '500' },

  // ETA
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  etaText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  // Cancel
  cancelBtn: {
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
  cancelText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});

export default RequestSentScreen;
