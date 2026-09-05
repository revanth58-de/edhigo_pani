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
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { ratingService } from '../../services/api/ratingService';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';

const RateFarmerScreen = ({ navigation, route }) => {
  const { job, booking, isMachinery } = route.params || {};
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';
  const user = useAuthStore((state) => state.user);
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
      if (isMachinery || user?.role === 'machinery') {
        // Simulate premium rating submission
        await new Promise((resolve) => setTimeout(resolve, 1000));
        navigation.navigate('MachineryHome');
        return;
      }

      const response = await ratingService.rateFarmer({
        jobId: job.id,
        farmerId: job.farmerId || job.farmer?.id,
        rating,
      });

      if (response.success || response.message?.toLowerCase().includes('already rated')) {
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

  // Generate UPI payment details
  const upiId = user?.upiId || `${user?.phone || 'worker'}@upi`;
  const amount = isMachinery
    ? (booking?.totalPrice || booking?.price || 1000)
    : (job?.payPerDay || 500);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rate Farmer</Text>
        <Text style={styles.headerSubtitle}>రైతును రేట్ చేయండి</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Payment QR Code Section */}
        <View style={styles.qrSection}>
          <Text style={styles.qrLabel}>SHOW THIS QR TO FARMER FOR PAYMENT</Text>
          <View style={styles.qrCard}>
            <QRCode
              value={`upi://pay?pa=${upiId}&pn=Dinasari&am=${amount}&tn=FarmWork`}
              size={160}
              backgroundColor="white"
            />
            <Text style={styles.amountText}>Amount: ₹{amount}</Text>
            <Text style={styles.upiIdText}>UPI ID: {upiId}</Text>
          </View>
        </View>

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
      </ScrollView>
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
    paddingTop: Platform.OS === 'ios' ? 48 : Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 24,
    paddingBottom: 28,
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
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  qrSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  qrLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  qrCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  amountText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 16,
  },
  upiIdText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
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
    lineHeight: 26,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 24,
    textAlign: 'center',
    flexShrink: 1,
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
    lineHeight: 22,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 16,
    flexShrink: 1,
  },
  feedbackInput: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
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
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '900',
    color: colors.backgroundDark,
    flexShrink: 1,
  },
});

export default RateFarmerScreen;
