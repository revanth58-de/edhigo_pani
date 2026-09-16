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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import { socketService } from '../../services/socketService';
import BottomNavBar from '../../components/BottomNavBar';
import { formatWorkType, formatUserName } from '../../utils/formatHelper';
import alertSoundService from '../../services/alertSoundService';

const { width } = Dimensions.get('window');

const QRAttendanceScreen = ({ navigation, route }) => {
  const { job, booking, isMachinery, type = 'in' } = route.params || {};
  const user = useAuthStore((state) => state.user);
  const language = useAuthStore((state) => state.language) || 'te';

  // Calculate total workers expected
  const totalWorkers = isMachinery ? 1 : Math.max(1, Number(job?.workersNeeded) || (Array.isArray(job?.workers) ? job.workers.length : 1));
  const [checkedWorkers, setCheckedWorkers] = useState([]);

  useEffect(() => {
    socketService.connect();
    if (isMachinery && booking?.id) {
      socketService.joinBookingRoom(booking.id);
    } else if (job?.id) {
      socketService.joinJobRoom(job.id);
    }

    const eventName = type === 'in' ? 'attendance:check_in' : 'attendance:check_out';
    const handleAttendance = (data) => {
      const workerName = data.worker?.name || data.workerName || Worker ;
      const workerId = data.worker?.id || data.workerId || w_;

      setCheckedWorkers((prev) => {
        if (prev.some((w) => w.id === workerId)) return prev;
        const updated = [...prev, { id: workerId, name: workerName, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
        
        // Voice & Haptic confirmation
        alertSoundService.playAttendanceSuccess(type);

        // If all workers checked in, auto proceed after short delay
        if (updated.length >= totalWorkers) {
          setTimeout(() => {
            if (type === 'in') {
              navigation.replace('WorkInProgress', { job, booking, isMachinery, workers: updated });
            } else {
              navigation.replace('Payment', { job, booking, isMachinery, workers: updated });
            }
          }, 1200);
        }

        return updated;
      });
    };

    socketService.on(eventName, handleAttendance);

    return () => {
      socketService.off(eventName, handleAttendance);
    };
  }, [type, job?.id, booking?.id, isMachinery, totalWorkers]);

  const qrData = JSON.stringify(
    isMachinery
      ? {
          bookingId: booking?.id,
          farmerId: user?.id,
          type: type,
          timestamp: Date.now(),
        }
      : {
          jobId: job?.id,
          farmerId: user?.id,
          type: type,
          timestamp: Date.now(),
        }
  );

  const handleManualProceed = () => {
    if (type === 'in') {
      navigation.replace('WorkInProgress', { 
        job, 
        booking, 
        isMachinery, 
        workers: checkedWorkers.length > 0 ? checkedWorkers : [{ id: 'w1', name: 'Assigned Workers' }] 
      });
    } else {
      navigation.replace('Payment', { 
        job, 
        booking, 
        isMachinery, 
        workers: checkedWorkers.length > 0 ? checkedWorkers : [{ id: 'w1', name: 'Assigned Workers' }] 
      });
    }
  };

  const workTitle = isMachinery 
    ? (booking?.machinery?.name || 'Machinery Booking')
    : formatWorkType(job?.workType, language);

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

          {/* QR Code Card */}
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
                  <Text style={styles.badgePillText}>₹{job?.payPerDay || booking?.price || 500}/day</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={qrData}
                  size={Math.min(width * 0.55, 210)}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
                <View style={styles.logoOverlay}>
                  <MaterialIcons name="agriculture" size={24} color={colors.primary} />
                </View>
              </View>

              <Text style={styles.scanText}>
                {language === 'te' 
                  ? `కార్మికులు ఈ కోడ్‌ను స్కాన్ చేయాలి (${checkedWorkers.length}/${totalWorkers})`
                  : `Ask workers to scan this QR code (${checkedWorkers.length}/${totalWorkers})`}
              </Text>
            </View>
          </View>

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
});

export default QRAttendanceScreen;
