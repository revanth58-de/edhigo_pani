// Screen 22: Work Status - Exact match to worker-status.html
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import { getSpeechLang, safeSpeech } from '../../utils/voiceGuidance';
import useAuthStore from '../../store/authStore';

const WorkStatusScreen = ({ navigation, route }) => {
  const { job } = route.params || {};
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isOnBreak, setIsOnBreak] = useState(false);

  useEffect(() => {
    safeSpeech(t('voice.workInProgress'), { language: getSpeechLang(language) });
    
    // Timer logic
    let seconds = 0;
    const interval = setInterval(() => {
      seconds++;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleBreak = () => {
    setIsOnBreak(!isOnBreak);
    safeSpeech(isOnBreak ? t('voice.breakEnded') : t('voice.breakStarted'), { language: getSpeechLang(language) });
  };

  const handleEndWork = () => {
    safeSpeech(t('voice.endingWork'), { language: getSpeechLang(language) });
    navigation.navigate('QRScanner', { job, type: 'out' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Work in Progress</Text>
        <Text style={styles.headerSubtitle}>పని జరుగుతోంది</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Timer Card */}
        <View style={styles.timerCard}>
          <MaterialIcons name="schedule" size={48} color={colors.primary} />
          <Text style={styles.timerLabel}>Time Worked</Text>
          <Text style={styles.timerValue}>{elapsedTime}</Text>
          
          {isOnBreak && (
            <View style={styles.breakBadge}>
              <MaterialIcons name="coffee" size={20} color="#FFFFFF" />
              <Text style={styles.breakText}>ON BREAK</Text>
            </View>
          )}
        </View>

        {/* Job Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <MaterialIcons name="work" size={24} color={colors.primary} />
            <Text style={styles.detailLabel}>Work Type:</Text>
            <Text style={styles.detailValue}>{job?.workType || 'Harvesting'}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="payments" size={24} color={colors.primary} />
            <Text style={styles.detailLabel}>Pay:</Text>
            <Text style={styles.detailValue}>₹{job?.payPerDay || '500'}/day</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={24} color={colors.primary} />
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{job?.farmAddress || 'Farm'}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, isOnBreak && styles.actionButtonActive]}
            onPress={handleBreak}
            activeOpacity={0.9}
          >
            <MaterialIcons
              name="coffee"
              size={32}
              color={isOnBreak ? '#FFFFFF' : colors.primary}
            />
            <Text style={[styles.actionText, isOnBreak && styles.actionTextActive]}>
              {isOnBreak ? 'End Break' : 'Take Break'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} activeOpacity={0.9}>
            <MaterialIcons name="support-agent" size={32} color={colors.primary} />
            <Text style={styles.actionText}>Help</Text>
          </TouchableOpacity>
        </View>

        {/* Voice Guidance */}
        <View style={styles.voiceCard}>
          <MaterialIcons name="volume-up" size={24} color={colors.primary} />
          <Text style={styles.voiceText}>Tap "End Work" when you're done</Text>
        </View>
      </ScrollView>

      {/* End Work Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.endButton}
          onPress={handleEndWork}
          activeOpacity={0.9}
        >
          <MaterialIcons name="stop-circle" size={32} color="#FFFFFF" />
          <Text style={styles.endButtonText}>END WORK</Text>
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
  timerCard: {
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  timerLabel: {
    fontSize: 18,
    color: '#6f8961',
    marginTop: 16,
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  breakBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  breakText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 24,
    padding: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#6f8961',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131811',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actionButtonActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  actionTextActive: {
    color: '#FFFFFF',
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: `${colors.primary}0D`,
    padding: 16,
    borderRadius: 16,
  },
  voiceText: {
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
  endButton: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#EF4444',
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  endButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});

export default WorkStatusScreen;
