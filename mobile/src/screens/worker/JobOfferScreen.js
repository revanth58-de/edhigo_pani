// Screen 18: Job Offer - Exact match to job-offer-detail.html
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import { jobService } from '../../services/api/jobService';
import { socketService } from '../../services/socketService';

const JobOfferScreen = ({ navigation, route }) => {
  const { job } = route.params || {};
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = React.useState(false);

  // Store the job:taken callback so we can remove it BEFORE we accept
  const jobTakenHandlerRef = React.useRef(null);

  useEffect(() => {
    socketService.connect();
    if (user?.id) socketService.joinUserRoom(user.id);
    if (job?.id) socketService.joinJobRoom(job.id);

    // If ANOTHER worker accepts while we're viewing → warn and exit
    const handleJobTaken = ({ jobId }) => {
      if (jobId === job?.id) {
        Alert.alert(
          '⚡ Job Taken',
          'Another worker just accepted this job. It is no longer available.',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }]
        );
      }
    };
    jobTakenHandlerRef.current = handleJobTaken;
    socketService.onJobTaken(handleJobTaken);

    // Listen for job cancellation by farmer
    socketService.onJobCancelled((data) => {
      if (data.jobId === job?.id) {
        navigation.replace('JobCancelled', {
          job: { ...job, farmerName: data.farmerName, workType: data.workType },
        });
      }
    });

    return () => {
      socketService.offJobTaken(jobTakenHandlerRef.current);
      socketService.offJobCancelled();
    };
  }, []);


  const handleAccept = async () => {
    if (!user?.id || !job?.id) {
      Alert.alert('Error', 'Missing user or job information');
      return;
    }

    setLoading(true);

    // ⚠️ CRITICAL: Remove the job:taken listener BEFORE accepting.
    // When we accept, the backend broadcasts job:taken to everyone including us.
    // If the listener is still active, it fires and shows "Another worker accepted it"
    // on our own screen — a false positive. Detach it first, then accept.
    socketService.offJobTaken(jobTakenHandlerRef.current);
    jobTakenHandlerRef.current = null;

    try {
      const response = await jobService.acceptJob(job.id, user.id);
      if (response.success) {
        navigation.navigate('Navigation', { job });
      } else if (response.alreadyTaken) {
        Alert.alert(
          '⚡ Already Taken',
          'Another worker accepted this job just before you. Keep looking!',
          [{ text: 'Back to Feed', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to accept job');
      }
    } catch (error) {
      const errData = error?.response?.data;
      if (errData?.alreadyTaken) {
        Alert.alert(
          '⚡ Already Taken',
          'Another worker accepted this job just before you. Keep looking!',
          [{ text: 'Back to Feed', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', 'Failed to accept job. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleReject = () => {
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={['#FDFBF7', colors.backgroundLight]}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Spacer for status bar */}
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#131811" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NEW JOB OPPORTUNITY</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.jobTypeBadge}>
            <Text style={styles.jobTypeText}>{job?.workType || 'Harvesting'}</Text>
          </View>
          
          <Text style={styles.jobHeading}>Work Requested by {job?.farmer?.name || job?.farmerName || 'Farmer'}</Text>
          
          <View style={styles.locationContainer}>
            <View style={styles.locationIconWrap}>
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>Location</Text>
              <Text style={styles.locationValue}>{job?.farmAddress || job?.location || 'Malkapur Village'}</Text>
            </View>
          </View>

          <View style={styles.distanceBadge}>
            <MaterialIcons name="navigation" size={14} color="#6f8961" />
            <Text style={styles.distanceText}>{job?.distanceLabel || job?.distance || '2.4 KM Away'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>DAILY PAY</Text>
              <Text style={styles.statValue}>₹{job?.payPerDay || 500}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TOTAL SPOTS</Text>
              <Text style={styles.statValue}>{job?.workersNeeded || 10}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TIMING</Text>
              <Text style={styles.statValue}>8 HRS</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoNote}>
          <MaterialIcons name="info-outline" size={16} color="#9CA3AF" />
          <Text style={styles.infoNoteText}>Accepting this job will start navigation to the farm.</Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={handleReject}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.rejectButtonText}>REJECT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButtonWrap}
            onPress={handleAccept}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={colors.primaryGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.acceptButton}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.acceptButtonText}>ACCEPT JOB</Text>
                  <MaterialIcons name="trending-flat" size={24} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
  },
  headerRight: {
    width: 48,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#131811',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
    paddingTop: 20,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 16,
  },
  jobTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
  },
  jobTypeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  jobHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#131811',
    lineHeight: 32,
    marginBottom: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  locationIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTextWrap: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  locationValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#131811',
    marginTop: 2,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    marginLeft: 60,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6f8961',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F3F4F6',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#131811',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 30,
    marginTop: 24,
  },
  infoNoteText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1,
  },
  acceptButtonWrap: {
    flex: 2,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  acceptButton: {
    flexDirection: 'row',
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  acceptButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

export default JobOfferScreen;
