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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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

  useEffect(() => {

    // Connect socket and join rooms for cancellation alerts
    socketService.connect();
    if (user?.id) {
      socketService.joinUserRoom(user.id);
    }
    if (job?.id) {
      socketService.joinJobRoom(job.id);
    }

    // If another worker accepts this job while we are viewing it, warn immediately
    socketService.onJobTaken(({ jobId }) => {
      if (jobId === job?.id) {
        Alert.alert(
          '⚡ Job Taken',
          'Another worker just accepted this job. It is no longer available.',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }]
        );
      }
    });

    // Listen for job cancellation by farmer
    socketService.onJobCancelled((data) => {
      if (data.jobId === job?.id) {
        console.log('❌ Job cancelled by farmer while viewing offer:', data);
        navigation.replace('JobCancelled', {
          job: {
            ...job,
            farmerName: data.farmerName,
            workType: data.workType,
          },
        });
      }
    });

    return () => {
      socketService.offJobTaken();
      socketService.offJobCancelled();
    };
  }, []);

  const handleAccept = async () => {
    if (!user?.id || !job?.id) {
      Alert.alert('Error', 'Missing user or job information');
      return;
    }

    setLoading(true);
    try {
      const response = await jobService.acceptJob(job.id, user.id);

      if (response.success) {
        navigation.navigate('Navigation', { job });
      } else if (response.alreadyTaken) {
        // Race condition — another worker was faster
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
        console.error('Accept Job Error:', error);
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.workType}>{job?.workType?.toUpperCase() || 'NEW JOB'}</Text>
        <Text style={styles.subHeader}>Job Offer Available</Text>
      </View>

      {/* Job Details Card */}
      <View style={styles.detailsCard}>
        {/* Farmer Info */}
        <View style={styles.farmerSection}>
          <View style={styles.farmerAvatar}>
            <MaterialIcons name="agriculture" size={40} color={colors.primary} />
          </View>
          <View style={styles.farmerInfo}>
            <Text style={styles.farmerName}>{job?.farmerName || 'Farmer'}</Text>
            <View style={styles.locationRow}>
              <MaterialIcons name="location-on" size={18} color="#6f8961" />
              <Text style={styles.location}>
                {job?.location || 'Location'} • {job?.distance || 'Nearby'}
              </Text>
            </View>
          </View>
        </View>

        {/* Job Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="payments" size={32} color={colors.primary} />
            <Text style={styles.statValue}>₹{job?.payPerDay || 500}</Text>
            <Text style={styles.statLabel}>Per Day</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="schedule" size={32} color={colors.primary} />
            <Text style={styles.statValue}>8 hrs</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>

      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={handleAccept}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={48} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>ACCEPT</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={handleReject}
          disabled={loading}
          activeOpacity={0.9}
        >
          <MaterialIcons name="cancel" size={48} color="#FFFFFF" />
          <Text style={styles.rejectButtonText}>REJECT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  workType: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.backgroundDark,
    letterSpacing: 2,
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 16,
    color: colors.backgroundDark,
    opacity: 0.8,
  },
  detailsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  farmerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  farmerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  farmerInfo: {
    flex: 1,
  },
  farmerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 16,
    color: '#6f8961',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131811',
  },
  statLabel: {
    fontSize: 14,
    color: '#6f8961',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    padding: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  rejectButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

export default JobOfferScreen;
