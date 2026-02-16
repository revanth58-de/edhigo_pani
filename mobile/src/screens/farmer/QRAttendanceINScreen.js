// Screen 12: QR Attendance IN
// Based on: qr-scan-attendance.html (code29.html)
// Flow: Camera view to scan worker's QR code → Verifies worker → Attendance Confirmed (Screen 13)
// Features: Camera overlay, flashlight, help voice, manual simulation button (dev)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { Camera } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../theme/colors';
import { speak } from '../../utils/voiceGuidance';
import useAuthStore from '../../store/authStore';

const { width, height } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.7;

const QRAttendanceINScreen = ({ navigation, route }) => {
  const { worker, job } = route.params || {};
  const language = useAuthStore((state) => state.language) || 'en';

  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    
    // Auto-speak instructions
    speak('Please scan worker QR code', language);
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    // Vibrate or sound could go here
    Alert.alert('Scanned!', `Data: ${data} \nType: ${type}`, [
      { text: 'OK', onPress: () => navigation.navigate('WorkInProgress', { worker, job, scanData: data }) }
    ]);
  };

  const handleSimulateScan = () => {
    if (scanned) return;
    setScanned(true);
    // Simulate valid worker QR
    const mockData = `worker:${worker?.id || '123'}:job:${job?.id || '456'}`;
    
    setTimeout(() => {
       navigation.navigate('WorkInProgress', { worker, job, scanData: mockData });
    }, 500);
  };

  const toggleFlash = () => {
    setFlashMode(
      flashMode === Camera.Constants.FlashMode.off
        ? Camera.Constants.FlashMode.torch
        : Camera.Constants.FlashMode.off
    );
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      <Camera
        style={StyleSheet.absoluteFillObject}
        type={Camera.Constants.Type.back}
        flashMode={flashMode}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        ratio="16:9"
      >
        {/* Dark Overlay with cutout */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop}>
            <View style={styles.headerPill}>
              <MaterialIcons name="qr-code-scanner" size={24} color={colors.primary} />
              <Text style={styles.headerText}>QR Scan - Attendance In</Text>
            </View>
            <Text style={styles.subHeader}>Focus QR Code inside the square</Text>
          </View>
          
          <View style={styles.overlayCenter}>
            <View style={styles.overlaySide} />
            <View style={styles.scannerBox}>
              <View style={styles.scannerCornerTL} />
              <View style={styles.scannerCornerTR} />
              <View style={styles.scannerCornerBL} />
              <View style={styles.scannerCornerBR} />
              {/* Scanning visual line could be animated here */}
            </View>
            <View style={styles.overlaySide} />
          </View>
          
          <View style={styles.overlayBottom}>
            {/* Voice Help Card */}
            <View style={styles.voiceCard}>
              <View style={styles.voiceRow}>
                <MaterialIcons name="record-voice-over" size={20} color={colors.primary} />
                <Text style={styles.voiceStatus}>Automatic Voice Active</Text>
              </View>
              <Text style={styles.voiceText}>"Please scan worker's QR code"</Text>
            </View>

            {/* Controls */}
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.controlBtn} onPress={toggleFlash}>
                <MaterialIcons 
                  name={flashMode === Camera.Constants.FlashMode.torch ? "flashlight-off" : "flashlight-on"} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.helpBtn} onPress={handleSimulateScan}>
                <MaterialIcons name="touch-app" size={28} color="#131811" />
                <Text style={styles.helpText}>Simulate Scan</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.controlBtn} onPress={() => navigation.goBack()}>
                 <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#131811',
  },
  subHeader: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  overlayCenter: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scannerBox: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    borderWidth: 0,
    borderColor: 'transparent',
    position: 'relative',
  },
  // Scanner Corners
  scannerCornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: colors.primary, borderTopLeftRadius: 16 },
  scannerCornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: colors.primary, borderTopRightRadius: 16 },
  scannerCornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: colors.primary, borderBottomLeftRadius: 16 },
  scannerCornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: colors.primary, borderBottomRightRadius: 16 },

  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingTop: 20,
  },
  voiceCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  voiceStatus: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  voiceText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpBtn: {
    height: 64,
    paddingHorizontal: 24,
    borderRadius: 32,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 6,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
  },
  helpText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131811',
  },
});

export default QRAttendanceINScreen;
