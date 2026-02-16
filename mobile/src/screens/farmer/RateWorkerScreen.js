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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { ratingService } from '../../services/api/ratingService';
import { colors } from '../../theme/colors';

const RateWorkerScreen = ({ navigation, route }) => {
  const { job, worker } = route.params;
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    Speech.speak('Rate the worker. Tap stars to give rating.', { language: 'en' });
  }, []);

  const handleRatingPress = (value) => {
    setRating(value);
    Speech.speak(`${value} stars selected`, { language: 'en' });
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const response = await ratingService.rateWorker({
        jobId: job.id,
        workerId: worker?.id,
        rating,
        feedback,
      });

      if (response.success) {
        Speech.speak('Thank you for rating!', { language: 'en' });
        navigation.navigate('FarmerHome');
      } else {
        Alert.alert('Error', response.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Rate Worker Error:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rate Worker</Text>
        <Text style={styles.headerSubtitle}>మీరు వర్కర్ ను రేట్ చేయండి</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Worker Info Card */}
        <View style={styles.workerCard}>
          <View style={styles.workerAvatar}>
            <MaterialIcons name="person" size={48} color={colors.primary} />
          </View>
          <Text style={styles.workerName}>{worker?.name || 'Worker Name'}</Text>
          <Text style={styles.jobType}>{job?.workType || 'Harvesting'}</Text>
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

        {/* Voice Hint */}
        <View style={styles.voiceHint}>
          <MaterialIcons name="volume-up" size={20} color={colors.primary} />
          <Text style={styles.voiceHintText}>Tap stars to rate the worker</Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || rating === 0}
          activeOpacity={0.9}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'SUBMIT RATING'}
          </Text>
          <MaterialIcons name="send" size={24} color={colors.backgroundDark} />
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
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.backgroundDark,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.backgroundDark,
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  workerCard: {
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  workerAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}1A`,
    borderWidth: 4,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  workerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 4,
  },
  jobType: {
    fontSize: 16,
    color: '#6f8961',
  },
  ratingSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 8,
  },
  feedbackSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131811',
  },
  feedbackInput: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#131811',
    minHeight: 120,
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
  },
  voiceHintText: {
    fontSize: 14,
    color: '#6f8961',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'rgba(246, 248, 246, 0.95)',
  },
  submitButton: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.backgroundDark,
  },
});

export default RateWorkerScreen;
