// Screen 22: Work Status - Exact match to worker-status.html
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import { LinearGradient } from 'expo-linear-gradient';


const WorkStatusScreen = ({ navigation, route }) => {
  const { job } = route.params || {};
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isOnBreak, setIsOnBreak] = useState(false);

  useEffect(() => {

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
  };

  const handleEndWork = () => {
    navigation.navigate('QRScanner', { job, type: 'out' });
  };

  return (
    <LinearGradient
      colors={['#FDFBF7', colors.backgroundLight]}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Spacer for status bar */}
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>SESSION IN PROGRESS</Text>
        <TouchableOpacity style={styles.headerRight}>
          <MaterialIcons name="help-outline" size={24} color="#131811" />
        </TouchableOpacity>
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

      </ScrollView>

      {/* End Work Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.endButtonWrap}
          onPress={handleEndWork}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.endButton}
          >
            <Text style={styles.endButtonText}>FINISH WORK & CHECK-OUT</Text>
            <MaterialIcons name="qr-code- scanner" size={24} color="#FFFFFF" />
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
  headerLeft: {
    width: 48,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#131811',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 2,
  },
  headerRight: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 150,
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
  breakBadge: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  breakText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 8,
  },
  actionButtonActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#131811',
  },
  actionTextActive: {
    color: '#FFFFFF',
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
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

export default WorkStatusScreen;
