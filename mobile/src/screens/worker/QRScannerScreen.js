// Screen 20: QR Scanner - Exact match to qr-scan-attendance.html
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Camera } from 'expo-camera';
import { colors } from '../../theme/colors';
import { attendanceService } from '../../services/api/attendanceService';

const QRScannerScreen = ({ navigation, route }) => {
  const { job } = route.params;
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      Speech.speak('कृपया अपना कैमरा क्यूआर कोड की ओर रखें', { language: 'hi' });
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const response = await attendanceService.checkIn({
        jobId: job.id,
        workerId: job.workerId, // from job context
        qrData: data,
        timestamp: new Date().toISOString(),
      });

      if (response.success) {
        Speech.speak('Attendance marked! हाज़िरी लग गई है', { language: 'hi' });
        navigation.replace('AttendanceConfirmed', { job });
      } else {
        Alert.alert('Error', response.message || 'Failed to mark attendance');
        setScanned(false);
      }
    } catch (error) {
      console.error('Mark Attendance Error:', error);
      Alert.alert('Error', 'Failed to mark attendance. Please try again.');
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Camera View */}
      <Camera
        style={styles.camera}
        type={Camera.Constants.Type.back}
        flashMode={flashOn ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Dark Overlay */}
        <View style={styles.overlay} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerCard}>
            <MaterialIcons name="qr-code-scanner" size={30} color={colors.primary} />
            <Text style={styles.headerTitle}>QR Scan - Attendance In</Text>
          </View>
          <Text style={styles.headerSubtitle}>Focus QR Code inside the square</Text>
        </View>

        {/* Scanner Frame */}
        <View style={styles.scannerContainer}>
          <View style={styles.scannerFrame}>
            {/* Corner borders */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            
            {/* Scanning line */}
            <View style={styles.scanLine} />

            {/* Center icon */}
            <MaterialIcons name="center-focus-weak" size={80} color="rgba(255,255,255,0.4)" />
          </View>
        </View>

        {/* Success Overlay */}
        {scanned && (
          <View style={styles.successOverlay}>
            <View style={styles.successIcon}>
              <MaterialIcons name="check-circle" size={96} color={colors.backgroundDark} />
            </View>
            <Text style={styles.successTitle}>Attendance Marked!</Text>
            <Text style={styles.successSubtitle}>हाज़िरी लग गई है</Text>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.controls}>
          {/* Voice Guidance Card */}
          <View style={styles.voiceCard}>
            <View style={styles.voiceRow}>
              <MaterialIcons name="record-voice-over" size={20} color={colors.primary} />
              <Text style={styles.voiceText}>Automatic Voice Active</Text>
            </View>
            <Text style={styles.voiceSubtext}>"कृपया अपना कैमरा क्यूआर कोड की ओर रखें"</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setFlashOn(!flashOn)}
            >
              <MaterialIcons
                name={flashOn ? 'flashlight-off' : 'flashlight-on'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpButton}>
              <MaterialIcons name="vibration" size={30} color={colors.backgroundDark} />
              <Text style={styles.helpButtonText}>Help / मदद</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="photo-library" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
  },
  headerSubtitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scannerFrame: {
    width: 288,
    height: 288,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary,
  },
  cornerTopLeft: {
    top: -4,
    left: -4,
    borderTopWidth: 6,
    borderLeftWidth: 6,
    borderTopLeftRadius: 24,
  },
  cornerTopRight: {
    top: -4,
    right: -4,
    borderTopWidth: 6,
    borderRightWidth: 6,
    borderTopRightRadius: 24,
  },
  cornerBottomLeft: {
    bottom: -4,
    left: -4,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderBottomLeftRadius: 24,
  },
  cornerBottomRight: {
    bottom: -4,
    right: -4,
    borderBottomWidth: 6,
    borderRightWidth: 6,
    borderBottomRightRadius: 24,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 4,
    backgroundColor: colors.primary,
    opacity: 0.8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${colors.primary}E6`,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  successIcon: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  successTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.backgroundDark,
    marginTop: 32,
  },
  successSubtitle: {
    fontSize: 20,
    color: colors.backgroundDark,
    opacity: 0.8,
    marginTop: 8,
  },
  controls: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 24,
    zIndex: 10,
  },
  voiceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  voiceText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  voiceSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 9999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 16,
  },
  helpButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.backgroundDark,
  },
});

export default QRScannerScreen;
