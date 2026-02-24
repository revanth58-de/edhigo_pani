// Screen 9: Request Sent - Finding Workers with pulse animation
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { getSpeechLang, safeSpeech } from '../../utils/voiceGuidance';
import { socketService } from '../../services/socketService';

const RequestSentScreen = ({ navigation, route }) => {
  const { job } = route.params;
  const { isVoiceEnabled } = useAuthStore();
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';

  // Pulse animation refs
  const pulse1 = useRef(new Animated.Value(0.3)).current;
  const pulse2 = useRef(new Animated.Value(0.3)).current;
  const pulse3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isVoiceEnabled) {
      safeSpeech(t('requestSent.findingMessage'), { language: getSpeechLang(language) });
    }

    // Staggered pulse animations
    const createPulse = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1500, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 1500, easing: Easing.ease, useNativeDriver: true }),
        ])
      );
    };

    const p1 = createPulse(pulse1, 0);
    const p2 = createPulse(pulse2, 500);
    const p3 = createPulse(pulse3, 1000);

    p1.start();
    p2.start();
    p3.start();

    // Socket connection for real-time acceptance
    socketService.connect();
    if (job?.id) {
      socketService.joinJobRoom(job.id);
    }

    // Listen for real acceptance
    socketService.onJobAccepted((data) => {
      if (data.jobId === job?.id) {
        console.log('🎉 Job accepted real-time:', data);
        navigation.replace('RequestAccepted', { job: { ...job, ...data } });
      } else {
        console.log('📡 Received job:accepted for different job, ignoring:', data.jobId);
      }
    });

    return () => {
      p1.stop();
      p2.stop();
      p3.stop();
      socketService.offJobAccepted();
    };
  }, [job?.id]);

  const handleCancel = () => {
    if (isVoiceEnabled) {
      safeSpeech(t('requestSent.searchCancelled'), { language: getSpeechLang(language) });
    }
    navigation.navigate('FarmerHome');
  };

  // Capitalize the work type for display
  const workTypeDisplay = job?.workType
    ? job.workType.charAt(0).toUpperCase() + job.workType.slice(1)
    : 'Labour';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="wifi-tethering" size={24} color="#131811" />
        <Text style={styles.headerTitle}>{t('requestSent.title')}</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>{t('requestSent.findingWorkers')}</Text>
        <Text style={styles.subtitle}>
          {t('requestSent.searchingHelp')}
        </Text>

        {/* Pulse Animation */}
        <View style={styles.pulseContainer}>
          <Animated.View style={[styles.pulseRing3, { opacity: pulse3, transform: [{ scale: pulse3.interpolate({ inputRange: [0.3, 1], outputRange: [0.8, 1.2] }) }] }]} />
          <Animated.View style={[styles.pulseRing2, { opacity: pulse2, transform: [{ scale: pulse2.interpolate({ inputRange: [0.3, 1], outputRange: [0.85, 1.1] }) }] }]} />
          <Animated.View style={[styles.pulseRing1, { opacity: pulse1 }]} />
          <View style={styles.centerIcon}>
            <MaterialIcons name="person-search" size={40} color="#FFFFFF" />
          </View>
        </View>

        {/* Voice Guidance Badge */}
        <View style={styles.voiceBadge}>
          <MaterialIcons name="volume-up" size={16} color={colors.primary} />
          <Text style={styles.voiceBadgeText}>{t('requestSent.voiceGuidanceActive')}</Text>
        </View>
      </View>

      {/* Job Info Card */}
      <View style={styles.jobCard}>
        <View style={styles.jobCardLeft}>
          <MaterialIcons name="agriculture" size={24} color={colors.primary} />
          <View>
            <Text style={styles.jobCardWorkType}>{workTypeDisplay}</Text>
            <Text style={styles.jobCardWorkers}>{job?.workersNeeded || 1} {t('requestSent.workersRequested')}</Text>
          </View>
        </View>
        <View style={styles.jobCardImagePlaceholder}>
          <MaterialIcons name="grass" size={32} color={colors.primary} />
        </View>
      </View>

      {/* Cancel Button */}
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.8}>
        <MaterialIcons name="close" size={20} color="#6B7280" />
        <Text style={styles.cancelText}>{t('requestSent.cancelSearch')}</Text>
      </TouchableOpacity>

      {/* Estimated Wait */}
      <Text style={styles.waitText}>{t('requestSent.estimatedWait')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#131811',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#131811',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  pulseContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pulseRing3: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
    backgroundColor: 'transparent',
  },
  pulseRing2: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: `${colors.primary}60`,
    backgroundColor: `${colors.primary}10`,
  },
  pulseRing1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.primary}20`,
  },
  centerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  voiceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#131811',
    letterSpacing: 0.5,
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    marginHorizontal: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  jobCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  jobCardWorkType: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131811',
  },
  jobCardWorkers: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  jobCardImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 16,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  waitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
    letterSpacing: 1.5,
    paddingBottom: 32,
  },
});

export default RequestSentScreen;
