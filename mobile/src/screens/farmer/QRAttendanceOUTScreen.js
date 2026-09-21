// Screen 14: QR Attendance OUT - Checkout QR for workers to scan (Multi-Worker Supported)
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import { socketService } from '../../services/socketService';
import { jobAPI, attendanceAPI } from '../../services/api';
import BottomNavBar from '../../components/BottomNavBar';
import { formatWorkType, formatUserName } from '../../utils/formatHelper';
import alertSoundService from '../../services/alertSoundService';

const { width } = Dimensions.get('window');

const QRAttendanceOUTScreen = ({ navigation, route }) => {
  const { job, booking, isMachinery, workers: initialWorkers } = route?.params || {};
  const user = useAuthStore((state) => state.user);
  const language = useAuthStore((state) => state.language) || 'te';

  const [activeJob, setActiveJob] = useState(job || null);
  const [activeBooking, setActiveBooking] = useState(booking || null);
  const [loadingActiveJob, setLoadingActiveJob] = useState(!job?.id && !booking?.id);
  const [checkedOutWorkers, setCheckedOutWorkers] = useState([]);

  // Auto-resolve active job if not provided
  useEffect(() => {
    if (job?.id) {
      setActiveJob(job);
    }
    if (booking?.id) {
      setActiveBooking(booking);
    }
    if (!job?.id && !booking?.id) {
      setLoadingActiveJob(true);
      const req = jobAPI?.getMyJobs?.();
      if (req && typeof req.then === 'function') {
        req
          .then((res) => {
            const list = res?.data?.data || res?.data || [];
            if (Array.isArray(list) && list.length > 0) {
              const found = list.find((j) => j.status === 'in_progress' || j.status === 'assigned' || j.status === 'open') || list[0];
              setActiveJob(found);
            }
          })
          .catch((err) => console.warn('Failed to fetch active job for checkout:', err?.message))
          .finally(() => setLoadingActiveJob(false));
      } else {
        setLoadingActiveJob(false);
      }
    }
  }, [job?.id, booking?.id]);

  const currentJob = activeJob || job;
  const currentBooking = activeBooking || booking;
  const targetId = isMachinery ? currentBooking?.id : currentJob?.id;

  const totalWorkers = isMachinery ? 1 : Math.max(1, Number(currentJob?.workersNeeded) || (Array.isArray(initialWorkers) ? initialWorkers.length : 1));

  const workerCount = checkedOutWorkers.length > 0 ? checkedOutWorkers.length : totalWorkers;
  const durationDays = Math.max(1, Number(currentJob?.durationDays) || 1);
  const totalPayAmount = isMachinery
    ? (currentBooking?.totalPrice || currentBooking?.price || 1000)
    : (Number(currentJob?.payPerDay) || 500) * workerCount * durationDays;

  // Sync attendance records from database for checkout
  const syncAttendanceFromDB = async (targetJobId) => {
    if (!targetJobId || isMachinery) return;
    try {
      const req = attendanceAPI?.getRecords?.(targetJobId);
      if (!req || typeof req.then !== 'function') return;
      const res = await req;
      const records = res?.data?.data || res?.data || [];
      if (Array.isArray(records) && records.length > 0) {
        const filtered = records.filter((r) => !!r.checkOut);
        const mapped = filtered.map((r) => ({
          id: r.workerId || r.worker?.id || r.id,
          name: r.worker?.name || 'Worker',
          time: new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setCheckedOutWorkers((prev) => {
          let hasNew = false;
          const merged = [...prev];
          mapped.forEach((m) => {
            if (!merged.some((x) => x.id === m.id)) {
              merged.push(m);
              hasNew = true;
            }
          });
          return hasNew ? merged : prev;
        });
      }
    } catch (_) {
      // Quietly ignore polling errors
    }
  };

  useEffect(() => {
    if (!targetId) return;

    socketService.connect();
    if (isMachinery && currentBooking?.id) {
      socketService.joinBookingRoom(currentBooking.id);
    } else if (currentJob?.id) {
      socketService.joinJobRoom(currentJob.id);
    }

    // Immediate DB sync and recurring poll every 3.5s
    syncAttendanceFromDB(currentJob?.id);
    const pollTimer = setInterval(() => {
      syncAttendanceFromDB(currentJob?.id);
    }, 3500);

    const handleCheckOut = (data) => {
      if (data.jobId && currentJob?.id && data.jobId !== currentJob.id) return;
      const workerName = data.worker?.name || data.workerName || 'Worker';
      const workerId = data.worker?.id || data.workerId || `w_${Date.now()}`;

      setCheckedOutWorkers((prev) => {
        if (prev.some((w) => w.id === workerId)) return prev;
        const updated = [...prev, { id: workerId, name: workerName, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
        
        alertSoundService.playAttendanceSuccess('out');

        if (updated.length >= totalWorkers) {
          setTimeout(() => {
            navigation.replace('Payment', { job: currentJob, booking: currentBooking, isMachinery, workers: updated });
          }, 1500);
        }

        return updated;
      });
    };

    socketService.on('attendance:check_out', handleCheckOut);

    return () => {
      clearInterval(pollTimer);
      socketService.off('attendance:check_out', handleCheckOut);
    };
  }, [targetId, currentJob?.id, currentBooking?.id, isMachinery, totalWorkers]);

  const qrData = JSON.stringify(
    isMachinery
      ? {
          bookingId: currentBooking?.id,
          farmerId: user?.id,
          type: 'out',
          timestamp: Date.now(),
        }
      : {
          jobId: currentJob?.id,
          farmerId: user?.id,
          type: 'out',
          timestamp: Date.now(),
        }
  );

  const handleProceedToPayment = () => {
    navigation.replace('Payment', { 
      job: currentJob, 
      booking: currentBooking, 
      isMachinery, 
      workers: checkedOutWorkers.length > 0 ? checkedOutWorkers : initialWorkers || [{ id: 'w1', name: 'Assigned Workers' }],
      workerCount: checkedOutWorkers.length || totalWorkers,
    });
  };

  const workTitle = isMachinery 
    ? (currentBooking?.machinery?.name || 'Machinery Booking')
    : formatWorkType(currentJob?.workType, language);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B91C1C" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'te' ? 'పని ముగింపు QR (Checkout)' : 'Work Completion (Checkout QR)'}
        </Text>
        <TouchableOpacity 
          style={styles.helpBtn}
          onPress={() => alertSoundService.playNotificationAlert('Checkout Help', language === 'te' ? 'పని ముగింపుకు కార్మికులు ఈ QR స్కాన్ చేయాలి.' : 'Workers must scan this QR code to end work session.')}
        >
          <MaterialIcons name="volume-up" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Step Badge */}
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              FINAL STEP: WORK COMPLETION & WAGE SETTLEMENT
            </Text>
          </View>

          {/* Checkout Progress Banner */}
          <View style={[styles.progressBanner, checkedOutWorkers.length >= totalWorkers ? styles.progressBannerComplete : null]}>
            <View style={styles.progressIconWrap}>
              <MaterialIcons 
                name={checkedOutWorkers.length >= totalWorkers ? 'check-circle' : 'hourglass-top'} 
                size={28} 
                color={checkedOutWorkers.length >= totalWorkers ? '#10B981' : '#B91C1C'} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>
                {checkedOutWorkers.length} of {totalWorkers} {language === 'te' ? 'కార్మికులు ముగించారు' : 'Workers Checked Out'}
              </Text>
              <Text style={styles.progressSub}>
                {checkedOutWorkers.length >= totalWorkers
                  ? (language === 'te' ? 'అందరూ పూర్తయ్యారు! చెల్లింపు పేజీకి వెళ్లండి.' : 'All workers checked out! Proceed to pay.')
                  : (language === 'te' 
                      ? `మరో ${totalWorkers - checkedOutWorkers.length} మంది స్కాన్ చేయాలి` 
                      : `Waiting for ${totalWorkers - checkedOutWorkers.length} worker(s) to scan out`)}
              </Text>
            </View>
          </View>

          {/* Loading Indicator */}
          {loadingActiveJob && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#B91C1C" />
              <Text style={styles.loadingText}>
                {language === 'te' ? 'పని వివరాలు లోడ్ అవుతున్నాయి...' : 'Loading active job...'}
              </Text>
            </View>
          )}

          {/* Empty State when no active job is found */}
          {!loadingActiveJob && !targetId && (
            <View style={styles.emptyCard}>
              <MaterialIcons name="event-busy" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>
                {language === 'te' ? 'యాక్టివ్ పని ఏదీ లేదు' : 'No Active Job Found'}
              </Text>
              <Text style={styles.emptySub}>
                {language === 'te' 
                  ? 'ముగింపు కోసం యాక్టివ్ పని ఏదీ కనుగొనబడలేదు.' 
                  : 'No active job in progress to generate checkout QR code.'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: '#B91C1C' }]}
                onPress={() => navigation.navigate('FarmerHome')}
              >
                <MaterialIcons name="home" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>
                  {language === 'te' ? 'హోమ్ పేజీకి వెళ్లండి' : 'Go to Home'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* QR Card */}
          {targetId ? (
            <View style={styles.qrWrapper}>
              <View style={styles.qrCard}>
                <View style={styles.qrHeader}>
                  <View style={[styles.avatarPlaceholder, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.avatarText, { color: '#B91C1C' }]}>{user?.name?.charAt(0) || 'F'}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.farmerName}>{formatUserName(user?.name, 'Farmer / రైతు')}</Text>
                    <Text style={styles.phoneText}>{workTitle}</Text>
                  </View>
                  <View style={[styles.badgePill, { backgroundColor: '#FEF2F2' }]}>
                    <Text style={[styles.badgePillText, { color: '#DC2626' }]}>Check-Out</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.qrCodeContainer}>
                  <QRCode
                    value={qrData}
                    size={Math.min(width * 0.55, 210)}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                    ecl="H"
                  />
                  <View style={styles.logoOverlay}>
                    <MaterialIcons name="done-all" size={24} color="#B91C1C" />
                  </View>
                </View>

                {/* 6-Digit Job PIN / Code for manual checkout entry */}
                <View style={styles.pinContainer}>
                  <Text style={styles.pinLabel}>
                    {language === 'te' ? 'జాబ్ కోడ్ / PIN (కెమెరా గ్లేర్ ఉంటే):' : 'JOB PIN (Manual Code):'}
                  </Text>
                  <View style={[styles.pinBadge, { backgroundColor: '#7F1D1D' }]}>
                    <Text style={styles.pinCodeText}>
                      {String(targetId).slice(-6).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.pinSubText}>
                    {language === 'te' 
                      ? 'కార్మికులు తమ స్కానర్‌లో ఈ 6 అంకెల కోడ్‌ని నమోదు చేయవచ్చు' 
                      : 'Workers can type this 6-digit code in their scanner'}
                  </Text>
                </View>

                <Text style={styles.scanText}>
                  {language === 'te' 
                    ? `పని ముగింపు కోసం స్కాన్ చేయండి (${checkedOutWorkers.length}/${totalWorkers})`
                    : `Scan to complete shift (${checkedOutWorkers.length}/${totalWorkers})`}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Checked-out workers list */}
          {checkedOutWorkers.length > 0 && (
            <View style={styles.workerListBox}>
              <Text style={styles.workerListTitle}>
                {language === 'te' ? 'పూర్తయిన కార్మికులు (Completed Workers):' : 'Completed Workers:'}
              </Text>
              {checkedOutWorkers.map((w, index) => (
                <View key={w.id || index} style={styles.workerListItem}>
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.workerNameText}>{w.name}</Text>
                  <Text style={styles.workerTimeText}>{w.time}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Proceed to Payment Button */}
          <TouchableOpacity 
            style={styles.paymentButton}
            onPress={handleProceedToPayment}
            activeOpacity={0.85}
          >
            <MaterialIcons name="payments" size={24} color="#FFFFFF" />
            <Text style={styles.paymentButtonText}>
              {language === 'te' 
                ? `డబ్బులు చెల్లించండి (PAY ₹${totalPayAmount})`
                : `PROCEED TO PAY ₹${totalPayAmount}`}
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      <BottomNavBar role="farmer" activeTab="ShowQR" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#B91C1C',
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
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  stepBadge: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 14,
    alignSelf: 'center',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 14,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: '#B91C1C',
  },
  progressBannerComplete: {
    borderLeftColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  progressIconWrap: {
    marginRight: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  progressSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  qrWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 18,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  phoneText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  badgePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    width: '100%',
    marginVertical: 16,
  },
  qrCodeContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOverlay: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderRadius: 20,
    elevation: 2,
  },
  scanText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 14,
    textAlign: 'center',
  },
  workerListBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  workerListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  workerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 8,
  },
  workerNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  workerTimeText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  paymentButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pinContainer: {
    marginTop: 18,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    width: '100%',
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 6,
  },
  pinBadge: {
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    letterSpacing: 4,
  },
  pinCodeText: {
    color: '#FEF2F2',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
  },
  pinSubText: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 6,
    textAlign: 'center',
  },
  loadingBox: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 16,
    width: '100%',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#B91C1C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default QRAttendanceOUTScreen;
