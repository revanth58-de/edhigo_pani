// Screen 13: Work In Progress - Farmer view
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
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';

const WorkInProgressScreen = ({ navigation, route }) => {
  const { job } = route.params;
  const { t } = useTranslation();
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Work in Progress</Text>
        <Text style={styles.headerSubtitle}>పని జరుగుతోంది</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.timerCard}>
          <MaterialIcons name="schedule" size={48} color={colors.primary} />
          <Text style={styles.timerLabel}>Work Duration</Text>
          <Text style={styles.timerValue}>{elapsedTime}</Text>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <MaterialIcons name="work" size={24} color={colors.primary} />
            <Text style={styles.detailLabel}>Work Type:</Text>
            <Text style={styles.detailValue}>{job?.workType || 'Harvesting'}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="group" size={24} color={colors.primary} />
            <Text style={styles.detailLabel}>Workers:</Text>
            <Text style={styles.detailValue}>{job?.workersNeeded || '10'}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="payments" size={24} color={colors.primary} />
            <Text style={styles.detailLabel}>Total Pay:</Text>
            <Text style={styles.detailValue}>₹{(job?.payPerDay || 500) * (job?.workersNeeded || 10)}</Text>
          </View>
        </View>

        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Work Ongoing</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.endButton}
          onPress={() => navigation.navigate('QRAttendance', { job, type: 'out' })}
          activeOpacity={0.9}
        >
          <Text style={styles.endButtonText}>END WORK</Text>
          <MaterialIcons name="stop-circle" size={28} color={colors.backgroundDark} />
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: `${colors.primary}1A`,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131811',
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
  endButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.backgroundDark,
  },
});

export default WorkInProgressScreen;
