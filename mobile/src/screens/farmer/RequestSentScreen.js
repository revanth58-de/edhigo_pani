// Screen 9: Request Sent - Exact match to request-sent.html
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors } from '../../theme/colors';
import { socketService } from '../../services/socketService';

const RequestSentScreen = ({ navigation, route }) => {
  const { job } = route.params;
  const [dots, setDots] = useState('');

  useEffect(() => {
    Speech.speak('Finding workers for you. Please wait.', { language: 'en' });

    // Animated dots
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    // Connect and join job room
    socketService.connect();
    if (job?.id) {
      socketService.joinJobRoom(job.id);
    }

    // Listen for real acceptance
    socketService.onJobAccepted((data) => {
      // SECURITY: Ensure this acceptance is for OUR job
      if (data.jobId === job?.id) {
        console.log('🎉 Job accepted real-time:', data);
        navigation.replace('RequestAccepted', { job: { ...job, ...data } });
      } else {
        console.log('📡 Received job:accepted for different job, ignoring:', data.jobId);
      }
    });

    return () => {
      clearInterval(interval);
      socketService.offJobAccepted();
      // We don't necessarily want to disconnect the whole socket here 
      // as we might need it for location in the next screen
    };
  }, [job?.id]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.content}>
        {/* Animated Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.pulseCircle1} />
          <View style={styles.pulseCircle2} />
          <View style={styles.iconCircle}>
            <MaterialIcons name="search" size={80} color={colors.primary} />
          </View>
        </View>

        {/* Main Message */}
        <Text style={styles.title}>Finding Workers{dots}</Text>
        <Text style={styles.subtitle}>కార్మికులను వెదుకుతున్నాము</Text>

        {/* Job Info Card */}
        <View style={styles.jobCard}>
          <View style={styles.jobRow}>
            <MaterialIcons name="work" size={24} color={colors.primary} />
            <Text style={styles.jobLabel}>Work Type:</Text>
            <Text style={styles.jobValue}>{job?.workType || 'Harvesting'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.jobRow}>
            <MaterialIcons name="group" size={24} color={colors.primary} />
            <Text style={styles.jobLabel}>Workers Needed:</Text>
            <Text style={styles.jobValue}>{job?.workersNeeded || '10'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.jobRow}>
            <MaterialIcons name="payments" size={24} color={colors.primary} />
            <Text style={styles.jobLabel}>Pay Per Day:</Text>
            <Text style={styles.jobValue}>₹{job?.payPerDay || '500'}</Text>
          </View>
        </View>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching nearby workers...</Text>
        </View>

        {/* Voice Hint */}
        <View style={styles.voiceHint}>
          <MaterialIcons name="volume-up" size={20} color={colors.primary} />
          <Text style={styles.voiceHintText}>We'll notify you when workers respond</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  pulseCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: `${colors.primary}1A`,
  },
  pulseCircle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${colors.primary}33`,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#131811',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#6f8961',
    textAlign: 'center',
    marginBottom: 40,
  },
  jobCard: {
    width: '100%',
    backgroundColor: colors.backgroundLight,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: `${colors.primary}33`,
    marginBottom: 32,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  jobLabel: {
    fontSize: 16,
    color: '#6f8961',
    flex: 1,
  },
  jobValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6f8961',
    fontWeight: '500',
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${colors.primary}0D`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  voiceHintText: {
    fontSize: 14,
    color: '#6f8961',
    fontWeight: '500',
  },
});

export default RequestSentScreen;
