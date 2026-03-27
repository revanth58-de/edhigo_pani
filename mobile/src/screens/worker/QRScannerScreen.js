// Screen 20: QR Scanner — Worker Dashboard (Expo Go compatible, SDK 54)
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
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { attendanceService } from '../../services/api/attendanceService';
import useAuthStore from '../../store/authStore';
import * as Location from 'expo-location';
import BottomNavBar from '../../components/BottomNavBar';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const SCAN_BOX_SIZE = width * 0.7;

const HELP_STEPS = [
  {
    icon: 'qr-code-scanner',
    title: 'Point camera at QR code',
    desc: 'Hold your phone steady and align the QR code inside the frame.',
  },
  {
    icon: 'location-on',
    title: 'Allow location access',
    desc: 'Your location is needed to confirm you are at the farm when checking in or out.',
  },
  {
    icon: 'photo-library',
    title: 'Upload QR from gallery',
    desc: 'Tap the gallery icon to select an image containing the QR code. The app will scan it automatically.',
  },
  {
    icon: 'flashlight-on',
    title: 'Use flashlight in dark',
    desc: 'Tap the flashlight icon to turn on the torch when lighting is poor.',
  },
  {
    icon: 'check-circle',
    title: 'Confirm attendance',
    desc: 'After a successful scan you will see a confirmation screen and attendance is marked.',
  },
];

const QRScannerScreen = ({ navigation, route }) => {
  const { job } = route.params || {};
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    const timer = setTimeout(checkPermission, 100);
    return () => clearTimeout(timer);
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

  const processQRData = async (data) => {
    if (loading) return;
    setLoading(true);
    try {
      let qrInfo;
      try {
        qrInfo = JSON.parse(data);
      } catch (_) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not a valid farm attendance code. Please scan the QR shown by the farmer.'
        );
        setScanned(false);
        setLoading(false);
        return;
      }

      if (!qrInfo.jobId || !qrInfo.type) {
        Alert.alert(
          'Wrong QR Code',
          'This QR code is missing job information. Please ask the farmer to show the correct QR code.'
        );
        setScanned(false);
        setLoading(false);
        return;
      }

      if (qrInfo.timestamp && Date.now() - qrInfo.timestamp > 15 * 60 * 1000) {
        Alert.alert(
          'QR Code Expired',
          'This QR code is older than 15 minutes. Please ask the farmer to refresh it.'
        );
        setScanned(false);
        setLoading(false);
        return;
      }

      const isCheckOut = qrInfo.type === 'out';

      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        Alert.alert('Location Required', 'Please allow location access to mark attendance.');
        setScanned(false);
        setLoading(false);
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const user = useAuthStore.getState().user;
      const payload = {
        jobId: qrInfo.jobId,
        workerId: user?.id,
        [isCheckOut ? 'checkOutLatitude' : 'checkInLatitude']: coords.latitude,
        [isCheckOut ? 'checkOutLongitude' : 'checkInLongitude']: coords.longitude,
        [isCheckOut ? 'qrCodeOut' : 'qrCodeIn']: data,
      };

      const response = await (isCheckOut
        ? attendanceService.checkOut(payload)
        : attendanceService.checkIn(payload));

      if (response.success) {
        const farmerId = response.data?.job?.farmerId || job?.farmerId || job?.farmer?.id;
        navigation.replace(isCheckOut ? 'RateFarmer' : 'AttendanceConfirmed', {
          job: { ...job, id: qrInfo.jobId, farmerId },
        });
      } else {
        Alert.alert('Attendance Failed', response.message || 'Could not mark attendance.');
        setScanned(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('QR Process Error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Something went wrong.';
      Alert.alert('Error', msg);
      setScanned(false);
      setLoading(false);
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    processQRData(data);
  };

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;

      Alert.alert(
        '📷 Gallery QR Tip',
        'To scan a QR from a saved image:\n\n1. Open the image full-screen on another device\n2. Point this camera at it',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Gallery Error:', error);
      Alert.alert('Error', 'Could not open photo library.');
    }
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
        <Text style={styles.headerTitle}>Scan to Pay / Check-In</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setHelpVisible(true)}>
          <MaterialIcons name="help-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
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

                {loading && (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                )}
              </View>
              
              <View style={styles.overlayDark} />
           </View>

           <View style={styles.overlayRowBottom}>
              <View style={styles.overlayDark}>
                 <Text style={styles.instructionText}>
                    Align QR code within frame to scan
                 </Text>
              </View>
           </View>
        </View>

        {/* Success Overlay */}
        {scanned && !loading && (
          <View style={styles.successOverlay}>
            <View style={styles.successIcon}>
              <MaterialIcons name="check-circle" size={80} color={colors.primary} />
            </View>
            <Text style={styles.successTitle}>Scanned Successfully</Text>
          </View>
        )}
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

        <TouchableOpacity style={styles.controlItem} onPress={handleImageUpload}>
          <View style={styles.controlIconWrap}>
             <MaterialIcons name="photo-library" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.controlLabel}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlItem} 
          onPress={() => {
             if (scanned && !loading) {
               setScanned(false);
               setLoading(false);
             } else {
               setHelpVisible(true);
             }
          }}
        >
          <View style={styles.controlIconWrap}>
             <MaterialIcons name={scanned && !loading ? "refresh" : "info-outline"} size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.controlLabel}>{scanned && !loading ? "Scan Again" : "Help"}</Text>
        </TouchableOpacity>
      </View>

      <BottomNavBar role="worker" activeTab="ShowQR" />

      {/* Help Modal */}
      <Modal visible={helpVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan Instructions</Text>
              <TouchableOpacity onPress={() => setHelpVisible(false)} style={styles.modalClose}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {HELP_STEPS.map((step, idx) => (
                <View key={idx} style={styles.helpStep}>
                  <View style={styles.helpStepIconWrap}>
                    <MaterialIcons name={step.icon} size={24} color={colors.primary} />
                  </View>
                  <View style={styles.helpStepText}>
                    <Text style={styles.helpStepTitle}>{step.title}</Text>
                    <Text style={styles.helpStepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  
  loadingBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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

  // Success
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successIcon: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    padding: 16,
    marginBottom: 24,
  },
  successTitle: { fontSize: 24, color: '#FFFFFF', fontWeight: 'bold' },

  // Modal styling
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  modalClose: { padding: 4 },
  helpStep: { flexDirection: 'row', marginBottom: 24, gap: 16 },
  helpStepIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  helpStepText: { flex: 1 },
  helpStepTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  helpStepDesc: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
});

export default QRScannerScreen;
