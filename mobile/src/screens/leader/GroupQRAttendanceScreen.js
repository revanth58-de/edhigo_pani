import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import * as Location from 'expo-location';
import socketService from '../../services/socketService';

const GroupQRAttendanceScreen = ({ navigation, route }) => {
  const { job, groupId, type } = route.params || { type: 'IN' };
  const { t } = useTranslation();
  const [qrValue, setQrValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    generateQR();
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateQR();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    // Listen for attendance confirmation from backend (via socket)
    socketService.on('attendance:confirmed', (data) => {
      if (data.groupId === groupId) {
        navigation.navigate('GroupAttendanceConfirmed', { job, groupId, type });
      }
    });

    return () => {
      clearInterval(timer);
      socketService.off('attendance:confirmed');
    };
  }, []);

  const generateQR = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const timestamp = Date.now();
      // Secure format: groupId|timestamp|lat|lon|signature(mocked)
      const value = `SECURE_ATTENDANCE|${groupId}|${timestamp}|${loc.coords.latitude}|${loc.coords.longitude}|${type}`;
      setQrValue(value);
      setTimeLeft(30);
    } catch (error) {
      console.error('QR Generation Error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={colors.backgroundDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'IN' ? 'Check-In Attendance' : 'Check-Out Attendance'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>SHOW TO FARMER</Text>
          <View style={styles.qrContainer}>
            {qrValue ? (
              <QRCode
                value={qrValue}
                size={240}
                color={colors.primary}
                backgroundColor="#FFFFFF"
              />
            ) : (
              <ActivityIndicator size="large" color={colors.primary} />
            )}
          </View>

          <View style={styles.timerContainer}>
            <View style={[styles.timerBar, { width: `${(timeLeft / 30) * 100}%` }]} />
            <Text style={styles.timerText}>Regenerating in {timeLeft}s</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <MaterialIcons name="location-on" size={24} color={colors.primary} />
          <Text style={styles.infoText}>Must be within 100m of the farm</Text>
        </View>

        {/* PROTOTYPE: Simulate confirmation for testing */}
        <TouchableOpacity
          style={styles.simButton}
          onPress={() => navigation.navigate('GroupAttendanceConfirmed', { job, groupId, type })}
        >
          <Text style={styles.simButtonText}>Simulate Attendance (G8)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundLight },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.backgroundDark },
  content: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 8,
    width: '100%',
  },
  qrTitle: { fontSize: 18, fontWeight: '900', color: '#374151', marginBottom: 24 },
  qrContainer: { padding: 10, backgroundColor: '#FFF', borderRadius: 20 },
  timerContainer: { marginTop: 24, width: '100%', alignItems: 'center' },
  timerBar: { height: 4, backgroundColor: colors.primary, borderRadius: 2, marginBottom: 8 },
  timerText: { fontSize: 12, color: '#6B7280', fontWeight: 'bold' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 40, backgroundColor: `${colors.primary}1A`, padding: 16, borderRadius: 20 },
  infoText: { fontSize: 14, color: colors.primary, fontWeight: 'bold' },
  simButton: { marginTop: 20, padding: 10, backgroundColor: '#3B82F6', borderRadius: 8 },
  simButtonText: { color: '#FFF' }
});

export default GroupQRAttendanceScreen;
