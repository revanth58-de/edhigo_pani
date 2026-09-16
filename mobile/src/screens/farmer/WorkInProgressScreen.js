// Screen 13: Work In Progress - Farmer view (Bilingual, Multi-Worker tracking)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import { socketService } from '../../services/socketService';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';
import CustomLoader from '../../components/CustomLoader';
import { formatWorkType, formatUserName } from '../../utils/formatHelper';
import alertSoundService from '../../services/alertSoundService';

const WorkInProgressScreen = ({ navigation, route }) => {
  const { job: initialJob, jobId, booking, isMachinery, workers = [] } = route?.params || {};
  const [job, setJob] = useState(initialJob || null);
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'te';
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [fetching, setFetching] = useState(false);

  const targetJobId = jobId || initialJob?.id || initialJob?.jobId;

  useEffect(() => {
    if (targetJobId && (!job || !job.workType)) {
      const loadJob = async () => {
        setFetching(true);
        const { jobService } = require('../../services/api/jobService');
        const res = await jobService.getJob(targetJobId);
        if (res.success && res.data) {
          setJob(res.data.job || res.data);
        }
        setFetching(false);
      };
      loadJob();
    }
  }, [targetJobId]);

  useEffect(() => {
    socketService.connect();
    if (isMachinery && booking?.id) {
      socketService.joinBookingRoom(booking.id);
    } else if (job?.id) {
      socketService.joinJobRoom(job.id);
    }
  }, [job?.id, booking?.id, isMachinery]);

  useEffect(() => {
    let seconds = 0;
    const interval = setInterval(() => {
      seconds++;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleEndWork = () => {
    Alert.alert(
      language === 'te' ? 'పని ముగించాలా?' : 'End Work Session?',
      language === 'te' 
        ? 'కార్మికులు పని ముగింపు QR కోడ్‌ను స్కాన్ చేయాల్సి ఉంటుంది.' 
        : 'Workers will be asked to scan the check-out QR code. Proceed?',
      [
        { text: language === 'te' ? 'రద్దు (Cancel)' : 'Cancel', style: 'cancel' },
        {
          text: language === 'te' ? 'అవును, ముగించు (End Work)' : 'End Work',
          style: 'destructive',
          onPress: () => {
            try {
              if (isMachinery) {
                socketService.emit('work:done', {
                  bookingId: booking?.id,
                  farmerId: booking?.farmerId,
                });
              } else {
                socketService.emit('work:done', {
                  jobId: job?.id,
                  farmerId: job?.farmerId,
                });
              }
            } catch (e) {
              console.warn('Socket emit failed:', e.message);
            }

            if (isMachinery) {
              navigation.navigate('QRAttendanceOUT', { booking, isMachinery: true, workers });
            } else {
              navigation.navigate('QRAttendanceOUT', { job, workers });
            }
          },
        },
      ]
    );
  };

  if (fetching || (!isMachinery && !job)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDFBF7' }}>
        <CustomLoader size={48} color={colors.primary} />
      </View>
    );
  }

  const workTitle = isMachinery 
    ? (booking?.machinery?.name || 'Machinery Booking')
    : formatWorkType(job?.workType, language);

  const activeWorkerCount = workers.length > 0 
    ? workers.length 
    : (Number(job?.workersNeeded) || 1);

  const durationDays = Math.max(1, Number(job?.durationDays) || 1);

  const totalCost = isMachinery 
    ? (booking?.totalPrice || booking?.price || 0)
    : (job?.payPerDay || 500) * activeWorkerCount * durationDays;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('FarmerHome')} style={styles.headerIcon}>
          <MaterialIcons name="home" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'te' ? 'పని కొనసాగుతోంది' : 'WORK IN PROGRESS'}
        </Text>
        <TouchableOpacity 
          style={styles.headerIcon}
          onPress={() => alertSoundService.playNotificationAlert('Status', language === 'te' ? 'పని జరుగుతోంది. సమయం లెక్కింపబడుతోంది.' : 'Work is in progress. Timer is running.')}
        >
          <MaterialIcons name="volume-up" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Step Indicator */}
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            STEP 3 OF 4: ONGOING SHIFT & TIMER
          </Text>
        </View>

        {/* Live Timer Card */}
        <View style={styles.timerCard}>
          <View style={styles.timerIconCircle}>
            <MaterialIcons name="timer" size={32} color={colors.primary} />
          </View>
          <Text style={styles.timerLabel}>
            {language === 'te' ? 'పని జరుగుతున్న సమయం (Duration)' : 'Live Shift Clock'}
          </Text>
          <Text style={styles.timerValue}>{elapsedTime}</Text>
          
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              {language === 'te' ? 'కార్మికులు పొలంలో పని చేస్తున్నారు' : 'Active On Farm'}
            </Text>
          </View>
        </View>

        {/* Work & Wage Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardSectionTitle}>
            {language === 'te' ? 'పని & కూలీ వివరాలు' : 'Job & Wage Summary'}
          </Text>

          <View style={styles.detailRow}>
            <MaterialIcons name="agriculture" size={22} color={colors.primary} />
            <Text style={styles.detailLabel}>{language === 'te' ? 'పని రకం:' : 'Work Type:'}</Text>
            <Text style={styles.detailValue}>{workTitle}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="people" size={22} color={colors.primary} />
            <Text style={styles.detailLabel}>{language === 'te' ? 'హాజరైన కార్మికులు:' : 'Active Workers:'}</Text>
            <Text style={styles.detailValue}>{activeWorkerCount} {language === 'te' ? 'మంది' : 'Workers'}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="payments" size={22} color={colors.primary} />
            <Text style={styles.detailLabel}>{language === 'te' ? 'రోజు కూలీ:' : 'Daily Rate:'}</Text>
            <Text style={styles.detailValue}>₹{job?.payPerDay || 500} / day</Text>
          </View>

          <View style={[styles.detailRow, styles.totalRow]}>
            <MaterialIcons name="account-balance-wallet" size={22} color="#059669" />
            <Text style={[styles.detailLabel, { fontWeight: '700', color: '#059669' }]}>
              {language === 'te' ? 'మొత్తం అంచనా:' : 'Estimated Total:'}
            </Text>
            <Text style={styles.totalValue}>₹{totalCost}</Text>
          </View>
        </View>

        {/* Checked In Workers List */}
        {workers.length > 0 && (
          <View style={styles.workersBox}>
            <Text style={styles.workersBoxTitle}>
              {language === 'te' ? 'పనిలో ఉన్న కార్మికులు (Working Crew):' : 'Checked-In Crew:'}
            </Text>
            {workers.map((w, index) => (
              <View key={w.id || index} style={styles.workerRow}>
                <View style={styles.workerAvatar}>
                  <Text style={styles.workerAvatarText}>{w.name?.charAt(0) || 'W'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>{formatUserName(w.name, 'Worker')}</Text>
                  <Text style={styles.workerTime}>{w.time ? `Check-in: ${w.time}` : 'Present'}</Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>WORKING</Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* End Work Action Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.endButtonWrap}
          onPress={handleEndWork}
          activeOpacity={0.88}
        >
          <MaterialIcons name="stop-circle" size={26} color="#FFFFFF" />
          <Text style={styles.endButtonText}>
            {language === 'te' ? 'పని ముగించు (CHECKOUT QR)' : 'FINISH SHIFT (GENERATE CHECKOUT QR)'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: 16,
  },
  headerIcon: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  stepBadge: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 16,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  timerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  timerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  timerLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  timerValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 2,
    marginVertical: 8,
    fontVariant: ['tabular-nums'],
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 6,
    paddingTop: 10,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  workersBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  workersBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  workerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4338CA',
  },
  workerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  workerTime: {
    fontSize: 12,
    color: '#64748B',
  },
  activePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  endButtonWrap: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default WorkInProgressScreen;
