// Screen 10: Request Accepted - Match to request-accepted.html
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors } from '../../theme/colors';
import { socketService } from '../../services/socketService';

const RequestAcceptedScreen = ({ navigation, route }) => {
  const { job } = route.params;

  useEffect(() => {
    Speech.speak('Workers accepted! They are on the way.', { language: 'en' });

    // Connect and join room
    socketService.connect();
    if (job?.id) {
      socketService.joinJobRoom(job.id);
    }

    // Listen for arrival
    socketService.socket?.on('job:arrival', (data) => {
      if (data.jobId === job?.id) {
        console.log('🏁 Workers have arrived at farm!');
        navigation.navigate('ArrivalAlert', { job });
      } else {
        console.log('📡 Arrival for different job ignored:', data.jobId);
      }
    });

    return () => {
      socketService.socket?.off('job:arrival');
    };
  }, [job?.id]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <MaterialIcons name="check-circle" size={120} color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Workers Accepted!</Text>
        <Text style={styles.subtitle}>కార్మికులు అంగీకరించారు</Text>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="group" size={24} color={colors.primary} />
            <Text style={styles.infoLabel}>Workers Coming:</Text>
            <Text style={styles.infoValue}>{job?.workersNeeded || '10'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <MaterialIcons name="schedule" size={24} color={colors.primary} />
            <Text style={styles.infoLabel}>ETA:</Text>
            <Text style={styles.infoValue}>~15 minutes</Text>
          </View>
        </View>

        {/* Voice Hint */}
        <View style={styles.voiceHint}>
          <MaterialIcons name="volume-up" size={20} color={colors.primary} />
          <Text style={styles.voiceText}>They'll notify when they arrive</Text>
        </View>
      </View>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate('ArrivalAlert', { job })}
          activeOpacity={0.9}
        >
          <Text style={styles.continueButtonText}>CONTINUE</Text>
          <MaterialIcons name="arrow-forward" size={24} color={colors.backgroundDark} />
        </TouchableOpacity>
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
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#131811',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    color: '#6f8961',
    textAlign: 'center',
    marginBottom: 48,
  },
  infoCard: {
    width: '100%',
    backgroundColor: `${colors.primary}0D`,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: `${colors.primary}33`,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#6f8961',
    flex: 1,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    backgroundColor: `${colors.primary}0D`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  voiceText: {
    fontSize: 14,
    color: '#6f8961',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  continueButton: {
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
  continueButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.backgroundDark,
  },
});

export default RequestAcceptedScreen;
