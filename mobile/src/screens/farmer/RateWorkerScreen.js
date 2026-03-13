// Screen 16: Rate Worker - Exact match to rate-worker-farmer.html
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ratingService } from '../../services/api/ratingService';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import { LinearGradient } from 'expo-linear-gradient';

const RateWorkerScreen = ({ navigation, route }) => {
  const { job, worker, workers } = route.params || {};
  const { t } = useTranslation();
  
  // Support both single worker (legacy screens) and multiple workers (PaymentScreen)
  let workerList = workers || (worker ? [worker] : []);
  
  // Fallback: If no explicit worker object was passed, construct it from job's embedded worker details
  if (workerList.length === 0 && job?.workerId) {
    workerList = [{
      id: job.workerId,
      name: job.workerName || 'Worker',
      phone: job.workerPhone || '',
      photoUrl: job.workerPhotoUrl || null,
    }];
  }

  const displayWorker = workerList[0];
  const isMultiple = workerList.length > 1;
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
  }, []);

  const handleRatingPress = (value) => {
    setRating(value);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    const jobId = job?.id || job?.jobId;

    if (!jobId || workerList.length === 0) {
      console.warn('RateWorker: missing jobId or workerList', { job, workerList });
      Alert.alert('Error', 'Cannot submit rating — job or worker information is missing.');
      return;
    }

    setLoading(true);
    try {
      console.log('📡 Submitting rating for workers:', workerList.length, { jobId, rating });
      
      // Submit identical rating for all workers involved
      const results = await Promise.all(
        workerList.map(w => 
          ratingService.rateWorker({
            jobId,
            workerId: w?.id || w?.workerId,
            rating,
            feedback,
          })
        )
      );

      const allSuccess = results.every(r => r.success);

      if (allSuccess) {
        navigation.navigate('FarmerHome');
      } else {
        Alert.alert('Partially Successful', 'Some ratings failed to submit.');
        navigation.navigate('FarmerHome');
      }
    } catch (error) {
      console.error('Rate Worker Error:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>RATE EXPERIENCE</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Worker Info Card */}
        <View style={styles.workerCard}>
          <View style={styles.workerAvatar}>
            <MaterialIcons name={isMultiple ? "people" : "person"} size={48} color={colors.primary} />
          </View>
          <Text style={styles.workerName}>
            {displayWorker?.name || 'Worker'}
            {isMultiple ? ` + ${workerList.length - 1} Others` : ''}
          </Text>
          <Text style={styles.jobType}>{job?.workType || 'Job Completion'}</Text>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>How was the work quality?</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRatingPress(star)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={star <= rating ? 'star' : 'star-border'}
                  size={56}
                  color={star <= rating ? '#FFD700' : '#D1D5DB'}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.ratingText}>
              {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good!' : rating === 3 ? 'Average' : rating === 2 ? 'Below Average' : 'Poor'}
            </Text>
          )}
        </View>

        {/* Feedback Section */}
        <View style={styles.feedbackSection}>
          <View style={styles.feedbackHeader}>
            <MaterialIcons name="comment" size={24} color={colors.primary} />
            <Text style={styles.feedbackLabel}>Feedback (Optional)</Text>
          </View>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Share your experience..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={feedback}
            onChangeText={setFeedback}
            textAlignVertical="top"
          />
        </View>

      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButtonWrap, (rating === 0 || loading) && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading || rating === 0}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={colors.primaryGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.submitButton}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'SUBMIT FEEDBACK'}
            </Text>
            {!loading && <MaterialIcons name="trending-flat" size={24} color="#FFFFFF" />}
          </LinearGradient>
        </TouchableOpacity>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#131811',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 2,
  },
  headerIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
  },
  headerRight: {
    width: 48,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
    paddingTop: 20,
  },
  workerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  workerAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
  },
  workerName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#131811',
    letterSpacing: -0.5,
  },
  jobType: {
    fontSize: 15,
    color: '#6f8961',
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ratingSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131811',
    marginBottom: 24,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1,
  },
  feedbackSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#131811',
  },
  feedbackInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 20,
    fontSize: 16,
    color: '#131811',
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  submitButtonWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  submitButton: {
    flexDirection: 'row',
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

export default RateWorkerScreen;
