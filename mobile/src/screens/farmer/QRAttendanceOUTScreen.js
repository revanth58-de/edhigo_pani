import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import { socketService } from '../../services/socketService';

const { width } = Dimensions.get('window');

const QRAttendanceOUTScreen = ({ navigation, route }) => {
  const { job } = route.params || {};
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    socketService.connect();
    if (job?.id) {
      socketService.joinJobRoom(job.id);
    }

    socketService.socket?.on('attendance:check_out', (data) => {
      if (data.jobId === job?.id || !data.jobId) {
        navigation.replace('Payment', { job, attendanceData: data });
      }
    });

    return () => {
      socketService.socket?.off('attendance:check_out');
    };
  }, [job?.id]);

  const qrData = JSON.stringify({
    jobId: job?.id,
    farmerId: user?.id,
    type: 'out',
    timestamp: Date.now(),
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header - PhonePe Style (Solid Primary Color) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive Checkout</Text>
        <TouchableOpacity style={styles.helpBtn}>
          <MaterialIcons name="help-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Top Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialIcons name="info" size={20} color={colors.primary} />
          <Text style={styles.infoText}>Show this QR code to the worker</Text>
        </View>

        {/* QR Card - PhonePe Style */}
        <View style={styles.qrWrapper}>
          <View style={styles.qrCard}>
            <View style={styles.qrHeader}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'F'}</Text>
              </View>
              <View>
                <Text style={styles.farmerName}>{user?.name || 'Farmer'}</Text>
                <Text style={styles.phoneText}>{user?.phone || 'Farm Owner'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.qrCodeContainer}>
              <QRCode
                value={qrData}
                size={width * 0.6}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
              <View style={styles.logoOverlay}>
                <MaterialIcons name="agriculture" size={24} color={colors.primary} />
              </View>
            </View>

            <Text style={styles.scanText}>
              Scan to mark Check-Out
            </Text>
          </View>
        </View>

        {/* Job Details Box */}
        {job && (
          <View style={styles.jobBox}>
             <View style={styles.jobRow}>
               <Text style={styles.jobLabel}>Work Type</Text>
               <Text style={styles.jobValue}>{job.workType || 'Farm Work'}</Text>
             </View>
             <View style={styles.jobRow}>
               <Text style={styles.jobLabel}>Daily Wage</Text>
               <Text style={styles.jobValue}>₹{job.payPerDay || 500}</Text>
             </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  helpBtn: { padding: 8, marginRight: -8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 24,
    width: '100%',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1B4332',
    fontWeight: '500',
  },
  qrWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 32,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  farmerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  phoneText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    width: '100%',
    marginBottom: 24,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  logoOverlay: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  scanText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 24,
    fontWeight: '500',
    letterSpacing: 1,
  },
  jobBox: {
    marginTop: 32,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  jobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  jobLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  jobValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});

export default QRAttendanceOUTScreen;
