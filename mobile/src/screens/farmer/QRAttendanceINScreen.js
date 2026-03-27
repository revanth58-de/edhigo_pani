// Screen 12: QR Attendance IN (Farmer Scanning Worker)
// PhonePe Style Scanner UI
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const SCAN_BOX_SIZE = width * 0.7;

const QRAttendanceINScreen = ({ navigation, route }) => {
  const { worker, job } = route.params || {};
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    checkPermission();
  }, []);

  // Animate scan line
  useEffect(() => {
    if (scanned || loading) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [scanned, loading]);

  const handleBarCodeScanned = ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    // Vibrate or sound could go here
    Alert.alert('Scanned Successfully!', `Worker QR Detected`, [
      { text: 'OK', onPress: () => navigation.navigate('WorkInProgress', { worker, job, scanData: data }) }
    ]);
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialIcons name="camera-alt" size={64} color="#9CA3AF" />
        <Text style={styles.permissionText}>Camera access is required to scan QR codes.</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
        >
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scanLineY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_BOX_SIZE],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      {/* Top Header - PhonePe Style */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Worker QR</Text>
        <View style={{ width: 24 }} /> {/* Balance for back button */}
      </View>

      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flashOn}
        onBarcodeScanned={scanned || loading ? undefined : handleBarCodeScanned}
      >
        {/* Dark Overlay around Scanner */}
        <View style={styles.overlayContainer}>
           <View style={styles.overlayRow}>
              <View style={styles.overlayDark} />
           </View>
           
           <View style={styles.scannerRow}>
              <View style={styles.overlayDark} />
              
              {/* Central Transparent Cutout */}
              <View style={styles.scannerCutout}>
                {/* 4 Thick Corners */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {!scanned && !loading && (
                  <Animated.View style={[styles.scanLineWrap, { transform: [{ translateY: scanLineY }] }]}>
                    <View style={styles.scanLine} />
                    <LinearGradient
                      colors={[`${colors.primary}80`, 'transparent']}
                      style={styles.scanTrail}
                    />
                  </Animated.View>
                )}
              </View>
              
              <View style={styles.overlayDark} />
           </View>

           <View style={styles.overlayRowBottom}>
              <View style={styles.overlayDark}>
                 <Text style={styles.instructionText}>
                    Focus Worker's QR Code inside the square
                 </Text>
              </View>
           </View>
        </View>
      </CameraView>

      {/* Bottom Controls Bar - PhonePe Style */}
      <View style={styles.bottomControlsBar}>
        <TouchableOpacity 
          style={styles.controlItem} 
          onPress={() => setFlashOn(!flashOn)}
        >
          <View style={[styles.controlIconWrap, flashOn && styles.controlIconWrapActive]}>
             <MaterialIcons name={flashOn ? 'flashlight-on' : 'flashlight-off'} size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.controlLabel}>Flash</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlItem} 
          onPress={() => navigation.goBack()}
        >
          <View style={styles.controlIconWrap}>
             <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.controlLabel}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionText: { color: '#fff', fontSize: 16, marginTop: 16, textAlign: 'center' },
  retryButton: { marginTop: 24, backgroundColor: colors.primary, padding: 16, borderRadius: 12 },
  retryButtonText: { color: '#fff', fontWeight: 'bold' },

  // Header
  topHeader: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  iconBtn: { padding: 8, margin: -8 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },

  camera: { flex: 1 },

  // Scanner Overlay
  overlayContainer: { flex: 1 },
  overlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayRow: { flex: 1 },
  scannerRow: { flexDirection: 'row', height: SCAN_BOX_SIZE },
  overlayRowBottom: { flex: 1.5 },
  
  scannerCutout: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary,
    borderWidth: 5,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 16 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 16 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 16 },
  
  scanLineWrap: {
    position: 'absolute',
    top: 0, left: 10, right: 10,
    height: 80,
  },
  scanLine: {
    height: 3,
    backgroundColor: colors.primary,
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  scanTrail: {
    height: 60,
    width: '100%',
    opacity: 0.5,
  },
  
  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 32,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  // Bottom Controls (PhonePe Style)
  bottomControlsBar: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  controlItem: { alignItems: 'center', gap: 8 },
  controlIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIconWrapActive: { backgroundColor: colors.primary },
  controlLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
});

export default QRAttendanceINScreen;
