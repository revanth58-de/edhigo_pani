// Screen 12: QR Attendance - Display QR for workers to scan (with ScrollView)
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';

const QRAttendanceScreen = ({ navigation, route }) => {
  const { job, type = 'in' } = route.params || {};

  useEffect(() => {
    Speech.speak(type === 'in' ? 'Scan QR code to check in' : 'Scan QR code to check out', { language: 'en' });
  }, [type]);

  const qrData = JSON.stringify({
    jobId: job?.id,
    type: type,
    timestamp: Date.now(),
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Bar with Help */}
      <TopBar title={type === 'in' ? 'Check In QR' : 'Check Out QR'} showBack navigation={navigation} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <MaterialIcons name="qr-code-2" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>
            {type === 'in' ? 'ATTENDANCE IN' : 'ATTENDANCE OUT'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {type === 'in' ? 'హాజరు నమోదు' : 'నిష్క్రమణ నమోదు'}
          </Text>
        </View>

        {/* Instruction */}
        <View style={styles.instructionCard}>
          <MaterialIcons name="qr-code-scanner" size={32} color={colors.primary} />
          <Text style={styles.instructionText}>
            Workers, scan this code with your phone
          </Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrCard}>
            <QRCode
              value={qrData}
              size={260}
              backgroundColor="#FFFFFF"
            />
          </View>
          <Text style={styles.qrLabel}>
            {type === 'in' ? 'CHECK IN' : 'CHECK OUT'}
          </Text>
        </View>

        {/* Voice Hint */}
        <View style={styles.voiceHint}>
          <MaterialIcons name="volume-up" size={20} color={colors.primary} />
          <Text style={styles.voiceText}>
            Each worker should scan this code
          </Text>
        </View>

        {/* Job Info */}
        {job && (
          <View style={styles.jobInfo}>
            <Text style={styles.jobInfoTitle}>Job Details</Text>
            <Text style={styles.jobInfoText}>Work: {job.workType || 'Farm Work'}</Text>
            <Text style={styles.jobInfoText}>Pay: ₹{job.payPerDay || 500}/day</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Nav */}
      <BottomNavBar role="farmer" activeTab="ShowQR" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerCard: {
    backgroundColor: colors.primary,
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    gap: 8,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#131811',
    flex: 1,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 3,
    marginTop: 16,
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${colors.primary}0D`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
    marginBottom: 16,
  },
  voiceText: {
    fontSize: 14,
    color: '#6f8961',
    fontWeight: '500',
  },
  jobInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  jobInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 4,
  },
  jobInfoText: {
    fontSize: 14,
    color: '#6f8961',
  },
});

export default QRAttendanceScreen;
