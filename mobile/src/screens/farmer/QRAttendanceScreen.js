// Screen 12: QR Attendance - Display QR for workers to scan (Multi-Worker Supported)
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

const QRAttendanceScreen = ({ navigation, route }) => {
  const { job, booking, isMachinery, type = 'in' } = route?.params || {};
  const user = useAuthStore((state) => state.user);
  const language = useAuthStore((state) => state.language) || 'te';

  const [activeJob, setActiveJob] = useState(job || null);
  const [activeBooking, setActiveBooking] = useState(booking || null);
  const [loadingActiveJob, setLoadingActiveJob] = useState(!job?.id && !booking?.id);
  const [checkedWorkers, setCheckedWorkers] = useState([]);

  // Auto-resolve active job if not provided in route params
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
          .catch((err) => console.warn('Failed to fetch active job:', err?.message))
          .finally(() => setLoadingActiveJob(false));
      } else {
        setLoadingActiveJob(false);
      }
    }
  }, [job?.id, booking?.id]);

  const currentJob = activeJob || job;
  const currentBooking = activeBooking || booking;
  const targetId = isMachinery ? currentBooking?.id : currentJob?.id;

  // Calculate total workers expected
  const totalWorkers = isMachinery ? 1 : Math.max(1, Number(currentJob?.workersNeeded) || (Array.isArray(currentJob?.workers) ? currentJob.workers.length : 1));

  // Sync attendance records from database
  const syncAttendanceFromDB = async (targetJobId) => {
    if (!targetJobId || isMachinery) return;
    try {
      const req = attendanceAPI?.getRecords?.(targetJobId);
      if (!req || typeof req.then !== 'function') return;
      const res = await req;
      const records = res?.data?.data || res?.data || [];
      if (Array.isArray(records) && records.length > 0) {
        const filtered = records.filter((r) => (type === 'in' ? !!r.checkIn : !!r.checkOut));
        const mapped = filtered.map((r) => ({
          id: r.workerId || r.worker?.id || r.id,
          name: r.worker?.name || 'Worker',
          time: new Date(type === 'in' ? r.checkIn : r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setCheckedWorkers((prev) => {
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

    const eventName = type === 'in' ? 'attendance:check_in' : 'attendance:check_out';
    const handleAttendance = (data) => {
      if (data.jobId && currentJob?.id && data.jobId !== currentJob.id) return;
      const workerName = data.worker?.name || data.workerName || 'Worker';
      const workerId = data.worker?.id || data.workerId || `w_${Date.now()}`;

      setCheckedWorkers((prev) => {
        if (prev.some((w) => w.id === workerId)) return prev;
        const updated = [...prev, { id: workerId, name: workerName, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
        
        // Voice & Haptic confirmation
        alertSoundService.playAttendanceSuccess(type);

        // If all workers checked in, auto proceed after short delay
        if (updated.length >= totalWorkers) {
          setTimeout(() => {
            if (type === 'in') {
              navigation.replace('WorkInProgress', { job: currentJob, booking: currentBooking, isMachinery, workers: updated });
            } else {
              navigation.replace('Payment', { job: currentJob, booking: currentBooking, isMachinery, workers: updated });
            }
          }, 1500);
        }

        return updated;
      });
    };

    socketService.on(eventName, handleAttendance);

    return () => {
      clearInterval(pollTimer);
      socketService.off(eventName, handleAttendance);
    };
  }, [type, targetId, isMachinery, totalWorkers, currentJob?.id, currentBooking?.id]);

  const qrData = JSON.stringify(
    isMachinery
      ? {
          bookingId: currentBooking?.id,
          farmerId: user?.id,
          type: type,
          timestamp: Date.now(),
        }
      : {
          jobId: currentJob?.id,
          farmerId: user?.id,
          type: type,
          timestamp: Date.now(),
        }
  );

  const handleManualProceed = () => {
    if (type === 'in') {
      navigation.replace('WorkInProgress', { 
        job: currentJob, 
        booking: currentBooking, 
        isMachinery, 
        workers: checkedWorkers.length > 0 ? checkedWorkers : [{ id: 'w1', name: 'Assigned Workers' }] 
      });
    } else {
      navigation.replace('Payment', { 
        job: currentJob, 
        booking: currentBooking, 
        isMachinery, 
        workers: checkedWorkers.length > 0 ? checkedWorkers : [{ id: 'w1', name: 'Assigned Workers' }] 
      });
    }
  };

  const workTitle = isMachinery 
    ? (currentBooking?.machinery?.name || 'Machinery Booking')
    : formatWorkType(currentJob?.workType, language);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'in' 
            ? (language === 'te' ? 'హాజరు QR స్కాన్' : 'Scan Check-In QR')
            : (language === 'te' ? 'ముగింపు QR స్కాన్' : 'Scan Check-Out QR')}
        </Text>
        <TouchableOpacity 
          style={styles.helpBtn} 
          onPress={() => alertSoundService.playNotificationAlert('QR Help', language === 'te' ? 'కార్మికులు తమ ఫోన్ ద్వారా ఈ QR కోడ్‌ను స్కాన్ చేయాలి.' : 'Workers must scan this QR code on their phone.')}
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
          {/* Step Indicator */}
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              {type === 'in' ? 'STEP 2 OF 3: WORKER ATTENDANCE (హాజరు)' : 'STEP 3 OF 3: SHIFT COMPLETION (ముగింపు)'}
            </Text>
          </View>

          {/* Multi-Worker Progress Banner */}
          <View style={[styles.progressBanner, checkedWorkers.length >= totalWorkers ? styles.progressBannerComplete : null]}>
            <View style={styles.progressIconWrap}>
              <MaterialIcons 
                name={checkedWorkers.length >= totalWorkers ? 'check-circle' : 'group'} 
                size={28} 
                color={checkedWorkers.length >= totalWorkers ? '#10B981' : colors.primary} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>
                {checkedWorkers.length} of {totalWorkers} {language === 'te' ? 'కార్మికులు స్కాన్ చేసారు' : 'Workers Scanned'}
              </Text>
              <Text style={styles.progressSub}>
                {checkedWorkers.length >= totalWorkers
                  ? (language === 'te' ? 'అందరూ పూర్తయ్యారు! పని ప్రారంభించండి.' : 'All workers ready! Starting work session...')
                  : (language === 'te' 
                      ? `మరో ${totalWorkers - checkedWorkers.length} మంది స్కాన్ చేయాల్సి ఉంది` 
                      : `Waiting for ${totalWorkers - checkedWorkers.length} more worker(s) to scan`)}
              </Text>
            </View>
          </View>

          {/* Loading Indicator */}
          {loadingActiveJob && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
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
                  ? 'హాజరు తీసుకోవడానికి దయచేసి పనిని సృష్టించండి లేదా ప్రారంభించండి.' 
                  : 'Please create or start a job to generate attendance QR code.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('SelectWorkers')}
              >
                <MaterialIcons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>
                  {language === 'te' ? 'పనిని సృష్టించండి' : 'Post / Select Job'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* QR Code Card */}
          {targetId ? (
            <View style={styles.qrWrapper}>
              <View style={styles.qrCard}>
                <View style={styles.qrHeader}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'F'}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.farmerName}>{formatUserName(user?.name, 'Farmer / రైతు')}</Text>
                    <Text style={styles.phoneText}>{workTitle}</Text>
                  </View>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>₹{currentJob?.payPerDay || currentBooking?.price || 500}/day</Text>
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
                    <MaterialIcons name="agriculture" size={24} color={colors.primary} />
                  </View>
                </View>

                {/* 6-Digit Job PIN / Code for manual entry */}
                <View style={styles.pinContainer}>
                  <Text style={styles.pinLabel}>
                    {language === 'te' ? 'జాబ్ కోడ్ / PIN (కెమెరా గ్లేర్ ఉంటే):' : 'JOB PIN (Manual Code):'}
                  </Text>
                  <View style={styles.pinBadge}>
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
                    ? `కార్మికులు ఈ కోడ్‌ను స్కాన్ చేయాలి (${checkedWorkers.length}/${totalWorkers})`
                    : `Ask workers to scan this QR code (${checkedWorkers.length}/${totalWorkers})`}
                </Text>
              </View>
            </View>
          ) : null}

          {/* List of checked-in workers */}
          {checkedWorkers.length > 0 && (
            <View style={styles.workerListBox}>
              <Text style={styles.workerListTitle}>
                {language === 'te' ? 'హాజరైన కార్మికులు (Scanned Workers):' : 'Scanned Workers:'}
              </Text>
              {checkedWorkers.map((w, index) => (
                <View key={w.id || index} style={styles.workerListItem}>
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.workerNameText}>{w.name}</Text>
                  <Text style={styles.workerTimeText}>{w.time}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Primary Action Button to Proceed */}
          <TouchableOpacity 
            style={[styles.proceedButton, checkedWorkers.length > 0 ? styles.proceedButtonActive : null]}
            onPress={handleManualProceed}
            activeOpacity={0.85}
          >
            <MaterialIcons name="play-arrow" size={24} color="#FFFFFF" />
            <Text style={styles.proceedButtonText}>
              {checkedWorkers.length >= totalWorkers
                ? (language === 'te' ? 'పని ప్రారంభించండి (START WORK)' : 'START WORK NOW')
                : (language === 'te' 
                    ? `పని ప్రారంభించండి (${checkedWorkers.length}/${totalWorkers} వచ్చారు)` 
                    : `PROCEED WITH ${checkedWorkers.length} WORKER(S)`)}
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
    backgroundColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 14,
    alignSelf: 'center',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
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
    borderLeftColor: colors.primary,
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
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
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
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
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
  proceedButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedButtonActive: {
    backgroundColor: '#059669',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pinContainer: {
    marginTop: 18,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  pinBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    letterSpacing: 4,
  },
  pinCodeText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
  },
  pinSubText: {
    fontSize: 11,
    color: '#94A3B8',
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
    backgroundColor: colors.primary,
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

export default QRAttendanceScreen;
