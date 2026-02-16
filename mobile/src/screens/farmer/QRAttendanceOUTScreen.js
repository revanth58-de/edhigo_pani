// Screen 14: QR Attendance OUT
// Based on: qr-display-attendance-out.html (code27.html)
// Flow: Farmer displays QR code → Worker scans it → Job Complete (Screen 15 placeholder)
// Logic: Calculates mock payment based on duration.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../theme/colors';
import useAuthStore from '../../store/authStore';
import { speak } from '../../utils/voiceGuidance';

const { width } = Dimensions.get('window');

const QRAttendanceOUTScreen = ({ navigation, route }) => {
  const { worker, job, duration, startTime } = route.params || {};
  const language = useAuthStore((state) => state.language) || 'en';

  // Mock Calculation
  // Rate: ₹400/day (8 hours) => ₹50/hour => ~₹0.83/minute
  // Minimum ₹50
  const totalMinutes = Math.floor((duration || 0) / 60);
  const calculatedAmount = Math.max(50, Math.ceil(totalMinutes * 0.83));
  
  // QR Data Payload
  const qrPayload = JSON.stringify({
    type: 'attendance_out',
    jobId: job?.id || 'job_123',
    workerId: worker?.id || 'worker_456',
    amount: calculatedAmount,
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    // Auto-speak instructions
    speak('Work finished, please scan', language);
  }, []);

  const handleSimulateWorkerScan = () => {
    Alert.alert(
      'Worker Scanned!',
      'Simulating that the worker has successfully scanned this code.',
      [
        { 
          text: 'OK', 
          onPress: () => navigation.navigate('Payment', { worker, job, amount: calculatedAmount }) // Navigate to Payment
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.modePill}>
          <Text style={styles.modeText}>WORKER MODE</Text>
        </View>
        <Text style={styles.headerTitle}>SCAN TO FINISH</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Main QR Display */}
        <View style={styles.qrContainer}>
          <View style={styles.qrFrame}>
             <QRCode
               value={qrPayload}
               size={width * 0.6}
               color="black"
               backgroundColor="white"
             />
             
             {/* Corner Accents */}
             <View style={styles.cornerTL} />
             <View style={styles.cornerTR} />
             <View style={styles.cornerBL} />
             <View style={styles.cornerBR} />
          </View>
        </View>

        {/* Amount Display */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>ESTIMATED PAYMENT</Text>
          <Text style={styles.amountValue}>₹{calculatedAmount}</Text>
          <Text style={styles.amountSub}>Based on {totalMinutes} mins work</Text>
        </View>

        {/* Translation Guidance */}
        <View style={styles.guidanceContainer}>
          <Text style={styles.teluguText}>"Pani ayipoyindi, scan cheyandi"</Text>
          <Text style={styles.englishText}>Work finished, please scan</Text>
        </View>

        {/* Voice Button */}
        <TouchableOpacity 
          style={styles.voiceButton}
          activeOpacity={0.8}
          onPress={() => speak('Work finished, please scan', language)}
        >
          <MaterialIcons name="volume-up" size={28} color="#131811" />
          <Text style={styles.voiceButtonText}>PLAY VOICE INSTRUCTIONS</Text>
        </TouchableOpacity>

        {/* Dev Tool: Simulate Scan */}
        <TouchableOpacity 
          style={styles.simulateButton}
          onPress={handleSimulateWorkerScan}
        >
          <Text style={styles.simulateText}>[DEV] Simulate Worker Scan</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Footer Help */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.helpLink}>
          <MaterialIcons name="help-outline" size={20} color="#6b7280" />
          <Text style={styles.helpText}>Need help scanning?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8f6', // background-light
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modePill: {
    backgroundColor: 'rgba(91, 236, 19, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#131811',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#131811',
    letterSpacing: -1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  qrContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFrame: {
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 24,
    ...shadows.lg,
    position: 'relative',
    borderWidth: 4,
    borderColor: colors.primary,
  },
  // Corners
  cornerTL: { position: 'absolute', top: -4, left: -4, width: 24, height: 24, borderTopWidth: 4, borderLeftWidth: 4, borderColor: colors.primary },
  cornerTR: { position: 'absolute', top: -4, right: -4, width: 24, height: 24, borderTopWidth: 4, borderRightWidth: 4, borderColor: colors.primary },
  cornerBL: { position: 'absolute', bottom: -4, left: -4, width: 24, height: 24, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: colors.primary },
  cornerBR: { position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderBottomWidth: 4, borderRightWidth: 4, borderColor: colors.primary },

  amountCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 32,
    ...shadows.sm,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 1,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 40,
    fontWeight: '900',
    color: '#131811',
  },
  amountSub: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  guidanceContainer: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  teluguText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#131811',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  englishText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 32,
    ...shadows.md,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 24,
  },
  voiceButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#131811',
  },
  simulateButton: {
    padding: 16,
  },
  simulateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  helpLink: {
    flexDirection: 'row',
    gap: 8,
    opacity: 0.6,
  },
  helpText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default QRAttendanceOUTScreen;
