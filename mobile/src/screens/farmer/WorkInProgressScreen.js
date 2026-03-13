// Screen 13: Work In Progress - Farmer view
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import { socketService } from '../../services/socketService';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';

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

  const handleEndWork = () => {
    Alert.alert(
      'End Work',
      'Are you sure you want to end the work session? Workers will be prompted to scan the check-out QR.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Work',
          style: 'destructive',
          onPress: () => {
            // Notify all workers in this job to open checkout QR scanner
            socketService.socket?.emit('work:done', {
              jobId: job?.id,
              farmerId: job?.farmerId,
            });
            navigation.navigate('QRAttendance', { job, type: 'out' });
          },
        },
      ]
    );
  };
  return (
    <LinearGradient
      colors={['#FDFBF7', colors.backgroundLight]}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Spacer for status bar */}
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#131811" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ACTIVE SESSION</Text>
        <View style={styles.headerRight} />
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
          style={styles.endButtonWrap}
          onPress={handleEndWork}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']} // Red gradient for "End Work"
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.endButton}
          >
            <Text style={styles.endButtonText}>FINISH WORK SESSION</Text>
            <MaterialIcons name="stop-circle" size={26} color="#FFFFFF" />
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
  headerIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
  },
  headerRight: {
    width: 48,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#131811',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
    paddingTop: 20,
  },
  timerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 40,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6f8961',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  timerValue: {
    fontSize: 64,
    fontWeight: '900',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 32,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 15,
    color: '#9CA3AF',
    flex: 1,
    fontWeight: '600',
    marginLeft: 12,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#131811',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 32,
    alignSelf: 'center',
    backgroundColor: `${colors.primary}10`,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 99,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  endButtonWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  endButton: {
    flexDirection: 'row',
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  endButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

export default WorkInProgressScreen;
