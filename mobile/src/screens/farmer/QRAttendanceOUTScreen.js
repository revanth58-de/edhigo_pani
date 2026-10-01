import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import { socketService } from '../../services/socketService';
import { attendanceService } from '../../services/api/attendanceService';

const { width } = Dimensions.get('window');

const QRAttendanceOUTScreen = ({ navigation, route }) => {
  const { job, booking, isMachinery } = route.params || {};
  const user = useAuthStore((state) => state.user);

  // Track checkout progress across multiple workers
  const [totalWorkers, setTotalWorkers] = useState(null); // null = loading
  const [checkedOutCount, setCheckedOutCount] = useState(0);
  const [checkedOutWorkers, setCheckedOutWorkers] = useState([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the "all done" badge
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Fetch total checked-in worker count on mount so we know when everyone is done
  useEffect(() => {
    if (isMachinery || !job?.id) {
      // For machinery bookings, only 1 operator — so total = 1
      setTotalWorkers(1);
      return;
    }
    const fetchTotal = async () => {
      try {
        const res = await attendanceService.getAttendanceRecords(job.id);
        if (res.success && Array.isArray(res.data)) {
          const stillIn = res.data.filter((r) => r.checkIn && !r.checkOut).length;
          const alreadyOut = res.data.filter((r) => r.checkIn && r.checkOut).length;
          setTotalWorkers(Math.max(stillIn + alreadyOut, 1));
          // Pre-seed already-checked-out count
          if (alreadyOut > 0) setCheckedOutCount(alreadyOut);
        } else {
          setTotalWorkers(1);
        }
      } catch (_) {
        setTotalWorkers(1); // fallback
      }
    };
    fetchTotal();
  }, [job?.id, isMachinery]);

  // Socket setup — accumulate events, do NOT navigate on first event
  useEffect(() => {
    socketService.connect();
    if (isMachinery && booking?.id) {
      socketService.joinBookingRoom(booking.id);
    } else if (job?.id) {
      socketService.joinJobRoom(job.id);
    }

    const handleCheckOut = (data) => {
      const isRelevant = isMachinery
        ? data.bookingId === booking?.id || !data.bookingId
        : data.jobId === job?.id || !data.jobId;

      if (!isRelevant) return;

      const workerName = data.worker?.name || 'Worker';

      setCheckedOutWorkers((prev) => {
        // Avoid duplicate names (re-emits)
        if (prev.includes(workerName)) return prev;
        return [...prev, workerName];
      });

      setCheckedOutCount((prev) => prev + 1);
    };

    socketService.on('attendance:check_out', handleCheckOut);

    return () => {
      socketService.off('attendance:check_out', handleCheckOut);
    };
  }, [job?.id, booking?.id, isMachinery]);

  // Auto-navigate only when ALL workers have checked out
  useEffect(() => {
    if (totalWorkers === null) return;
    if (totalWorkers > 0 && checkedOutCount >= totalWorkers) {
      const timer = setTimeout(() => goToPayment(), 1500);
      return () => clearTimeout(timer);
    }
  }, [checkedOutCount, totalWorkers]);

  const goToPayment = () => {
    if (isMachinery) {
      navigation.replace('Payment', { booking, isMachinery: true });
    } else {
      navigation.replace('Payment', { job });
    }
  };

  const handleSkipScan = () => goToPayment();

  // Static QR — memoised so the code never changes while the screen is open
  const qrData = React.useMemo(
    () =>
      JSON.stringify(
        isMachinery
          ? { bookingId: booking?.id, farmerId: user?.id, type: 'out', timestamp: Date.now() }
          : { jobId: job?.id, farmerId: user?.id, type: 'out', timestamp: Date.now() }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [job?.id, booking?.id, user?.id, isMachinery]
  );

  const allDone = totalWorkers !== null && checkedOutCount >= totalWorkers;

  const progressText =
    totalWorkers === null
      ? 'Loading worker count...'
      : allDone
      ? 'All workers checked out! ✅'
      : `${checkedOutCount} / ${totalWorkers} workers checked out`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive Checkout</Text>
        <TouchableOpacity style={styles.helpBtn}>
          <MaterialIcons name="help-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Banner */}
        <View style={[styles.infoBanner, allDone && styles.infoBannerDone]}>
          <MaterialIcons
            name={allDone ? 'check-circle' : 'info'}
            size={20}
            color={allDone ? '#065F46' : colors.primary}
          />
          <Text style={[styles.infoText, allDone && styles.infoTextDone]}>
            {progressText}
          </Text>
        </View>

        {/* Live list of checked-out worker names */}
        {checkedOutWorkers.length > 0 && (
          <View style={styles.workerListBox}>
            {checkedOutWorkers.map((name, idx) => (
              <View key={idx} style={styles.workerRow}>
                <MaterialIcons name="check-circle" size={18} color="#059669" />
                <Text style={styles.workerName}>{name} checked out</Text>
              </View>
            ))}
          </View>
        )}

        {/* QR Card */}
        <View style={styles.qrWrapper}>
          <View style={[styles.qrCard, allDone && styles.qrCardDone]}>
            <View style={styles.qrHeader}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'F'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.farmerName}>{user?.name || 'Farmer'}</Text>
                <Text style={styles.phoneText}>{user?.phone || 'Farm Owner'}</Text>
              </View>
              {allDone && (
                <Animated.View
                  style={[styles.allDoneBadge, { transform: [{ scale: pulseAnim }] }]}
                >
                  <MaterialIcons name="done-all" size={20} color="#FFFFFF" />
                </Animated.View>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.qrCodeContainer}>
              {allDone ? (
                <View style={styles.allDoneQR}>
                  <MaterialIcons name="check-circle" size={80} color="#059669" />
                  <Text style={styles.allDoneText}>All Checked Out!</Text>
                </View>
              ) : (
                <>
                  <QRCode
                    value={qrData}
                    size={width * 0.6}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                  />
                  <View style={styles.logoOverlay}>
                    <MaterialIcons name="agriculture" size={24} color={colors.primary} />
                  </View>
                </>
              )}
            </View>

            <Text style={styles.scanText}>
              {allDone ? 'Proceeding to payment...' : 'Ask each worker to scan for Check-Out'}
            </Text>
          </View>
        </View>

        {/* Job / Booking Details Box */}
        {isMachinery && booking ? (
          <View style={styles.jobBox}>
            <View style={styles.jobRow}>
              <Text style={styles.jobLabel}>Machinery</Text>
              <Text style={styles.jobValue}>{booking.machinery?.name || 'Machine'}</Text>
            </View>
            <View style={styles.jobRow}>
              <Text style={styles.jobLabel}>Owner</Text>
              <Text style={styles.jobValue}>{booking.machinery?.owner?.name || 'Owner'}</Text>
            </View>
            <View style={styles.jobRow}>
              <Text style={styles.jobLabel}>Price</Text>
              <Text style={styles.jobValue}>₹{booking.totalPrice || booking.price || 0}</Text>
            </View>
          </View>
        ) : job ? (
          <View style={styles.jobBox}>
            <View style={styles.jobRow}>
              <Text style={styles.jobLabel}>Work Type</Text>
              <Text style={styles.jobValue}>{job.workType || 'Farm Work'}</Text>
            </View>
            <View style={styles.jobRow}>
              <Text style={styles.jobLabel}>Daily Wage</Text>
              <Text style={styles.jobValue}>₹{job.payPerDay || 500}</Text>
            </View>
          </View>
        ) : null}

        {/* Skip / Proceed button */}
        {!allDone ? (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipScan}
            activeOpacity={0.8}
          >
            <MaterialIcons name="done-all" size={20} color="#FFFFFF" />
            <Text style={styles.skipButtonText}>Skip Scan & Complete Work</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.skipButton, { backgroundColor: '#059669' }]}
            onPress={goToPayment}
            activeOpacity={0.8}
          >
            <MaterialIcons name="payments" size={20} color="#FFFFFF" />
            <Text style={styles.skipButtonText}>Proceed to Payment</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  helpBtn: { padding: 8, marginRight: -8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 24,
    width: '100%',
    gap: 12,
  },
  infoBannerDone: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#059669',
  },
  infoText: {
    fontSize: 14,
    color: '#1B4332',
    fontWeight: '500',
    flex: 1,
  },
  infoTextDone: {
    color: '#065F46',
    fontWeight: '700',
  },
  workerListBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    gap: 8,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workerName: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
  },
  qrWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrCardDone: {
    borderColor: '#059669',
    borderWidth: 2,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  farmerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  phoneText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  allDoneBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    width: '100%',
    marginBottom: 24,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    minHeight: 200,
  },
  logoOverlay: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  allDoneQR: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  allDoneText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  scanText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 24,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  jobBox: {
    marginTop: 20,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  jobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  jobLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  jobValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  skipButton: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#1E293B',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default QRAttendanceOUTScreen;
