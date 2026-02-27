import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import * as Speech from 'expo-speech';
import axios from 'axios';
import API_URL from '../../config/api.config';

const RateFarmerLeaderScreen = ({ navigation, route }) => {
  const { job, groupId } = route.params || {};
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Speech.speak("Dayachesi me anubhavanni rate cheyandi", { language: 'te' });
  }, []);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Selection Required', 'Please select a rating to continue.');
      return;
    }

    setLoading(true);
    try {
      // Mock API call to submit rating and close job
      // await axios.post(`${API_URL}/api/ratings`, { jobId: job.id, rating, feedback, groupId });
      Alert.alert('Thank You!', 'Job completed successfully.');
      navigation.navigate('LeaderHome');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating.');
    } finally {
      setLoading(false);
    }
  };

  const ratingOptions = [
    { value: 1, icon: 'sentiment-very-dissatisfied', color: '#EF4444', label: 'Sad' },
    { value: 3, icon: 'sentiment-neutral', color: '#F59E0B', label: 'Neutral' },
    { value: 5, icon: 'sentiment-very-satisfied', color: '#10B981', label: 'Happy' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Complete!</Text>
        <Text style={styles.headerSub}>How was the experience with Farmer?</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.ratingContainer}>
          {ratingOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.rateCard, rating === opt.value && { borderColor: opt.color, backgroundColor: `${opt.color}1A` }]}
              onPress={() => setRating(opt.value)}
            >
              <MaterialIcons
                name={opt.icon}
                size={60}
                color={rating === opt.value ? opt.color : '#D1D5DB'}
              />
              <Text style={[styles.rateLabel, rating === opt.value && { color: opt.color }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>Feedback</Text>
          <TextInput
            style={styles.input}
            placeholder="What could be better? (Optional)"
            multiline
            value={feedback}
            onChangeText={setFeedback}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, rating === 0 && styles.disabled]}
          onPress={handleSubmit}
          disabled={loading || rating === 0}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.submitText}>FINISH & CLOSE JOB</Text>
              <MaterialIcons name="done-all" size={24} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: colors.primary, paddingTop: 80, paddingBottom: 60, alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#FFF' },
  headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 12, paddingHorizontal: 40 },
  content: { flex: 1, padding: 24, marginTop: -30 },
  ratingContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  rateCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, padding: 20, alignItems: 'center', elevation: 4, borderWidth: 2, borderColor: 'transparent' },
  rateLabel: { marginTop: 8, fontWeight: 'bold', color: '#9CA3AF' },
  feedbackCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, elevation: 2 },
  feedbackTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 16, padding: 16, height: 120, textAlignVertical: 'top', fontSize: 16 },
  footer: { padding: 24, paddingBottom: 40 },
  submitButton: { height: 70, backgroundColor: colors.primary, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 4 },
  submitText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  disabled: { backgroundColor: '#D1D5DB', elevation: 0 }
});

export default RateFarmerLeaderScreen;
