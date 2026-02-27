// Screen 23: Rate Farmer - Worker version
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ratingService } from '../../services/api/ratingService';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';

const RateFarmerScreen = ({ navigation, route }) => {
  const { job } = route.params || {};
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRatingPress = (value) => {
    setRating(value);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const response = await ratingService.rateFarmer({
        jobId: job.id,
        rating,
        feedback,
      });

      if (response.success) {
        navigation.navigate('WorkerHome');
      } else {
        Alert.alert('Error', response.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Rate Farmer Error:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rate Farmer</Text>
        <Text style={styles.headerSubtitle}>రైతును రేట్ చేయండి</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>How was your experience?</Text>
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
        </View>

        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackLabel}>Feedback (Optional)</Text>
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
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  ratingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
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
  },
  feedbackSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 16,
  },
  feedbackInput: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#131811',
    minHeight: 120,
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

export default RateFarmerScreen;
