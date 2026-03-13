// Screen 20: QR Scanner — Worker Dashboard (Expo Go compatible, SDK 54)
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
import { BlurView } from 'expo-blur';

const HELP_STEPS = [
  {
    icon: 'qr-code-scanner',
    title: 'Point camera at QR code',
    desc: 'Hold your phone steady and align the QR code inside the green square frame.',
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
    desc: 'After a successful scan you will see a green confirmation screen and attendance is marked.',
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
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1800,
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
      // ── Step 1: Parse QR JSON ─────────────────────────────────────────────
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

      // ── Step 2: Validate required fields ──────────────────────────────────
      if (!qrInfo.jobId || !qrInfo.type) {
        Alert.alert(
          'Wrong QR Code',
          'This QR code is missing job information. Please ask the farmer to show the correct QR code from their Check-In/Check-Out screen.'
        );
        setScanned(false);
        setLoading(false);
        return;
      }

      // ── Step 3: Optional — check QR isn't too old (15 minutes) ────────────
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

      // ── Step 4: Get location ───────────────────────────────────────────────
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

      // ── Step 5: Submit attendance ─────────────────────────────────────────
      const response = await (isCheckOut
        ? attendanceService.checkOut(payload)
        : attendanceService.checkIn(payload));

      if (response.success) {
        navigation.replace(isCheckOut ? 'RateFarmer' : 'AttendanceConfirmed', {
          job: { ...job, id: qrInfo.jobId },
        });
      } else {
        // Show the actual backend error — not "Invalid QR"
        Alert.alert(
          'Attendance Failed',
          response.message || 'Could not mark attendance. Please try again.'
        );
        setScanned(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('QR Process Error:', err);
      // Network / unexpected error — show the actual error
      const msg = err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
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

  // ── Gallery image upload ──────────────────────────────────────────────────
  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to upload a QR code image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;

      // Guide the user — direct camera-based scanning is the reliable path in Expo Go
      Alert.alert(
        '📷 Gallery QR Tip',
        'To scan a QR from a saved image:\n\n1. Open the image full-screen on another device\n2. Point this camera at it\n\nOr ask the farmer to show the QR on their screen.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Gallery Error:', error);
      Alert.alert('Error', 'Could not open photo library. Please try again.');
    }
  };


  // ── Permission states ──────────────────────────────────────────────────────
  if (hasPermission === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.permissionText}>Requesting camera permission…</Text>
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
    outputRange: [0, 240],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flashOn}
        onBarcodeScanned={scanned || loading ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCard}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTitle}>ATTENDANCE SCAN</Text>
          </View>
          <TouchableOpacity style={styles.infoButton} onPress={() => setHelpVisible(true)}>
            <MaterialIcons name="info-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>Position the QR code within the frame</Text>
        </View>

        {/* Scanner frame */}
        <View style={styles.scannerContainer}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {!scanned && !loading && (
              <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]}>
                <LinearGradient
                  colors={['transparent', colors.primary, 'transparent']}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            )}

            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Verifying...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Success overlay */}
        {scanned && !loading && (
          <View style={styles.successOverlay}>
            <View style={styles.successIcon}>
              <MaterialIcons name="check-circle" size={96} color={colors.primary} />
            </View>
            <Text style={styles.successTitle}>Attendance Marked!</Text>
            <Text style={styles.successSubtitle}>हाज़िरी लग गई है</Text>
          </View>
        )}

        {/* Bottom controls */}
        <View style={styles.controls}>
          <View style={styles.controlRow}>
            {/* Flashlight */}
            <TouchableOpacity
              style={[styles.controlButton, flashOn && styles.controlButtonActive]}
              onPress={() => setFlashOn(!flashOn)}
            >
              <MaterialIcons
                name={flashOn ? 'flashlight-on' : 'flashlight-off'}
                size={24}
                color={flashOn ? '#131811' : '#FFFFFF'}
              />
            </TouchableOpacity>

            {/* Gallery */}
            <TouchableOpacity style={styles.controlButton} onPress={handleImageUpload}>
              <MaterialIcons name="photo-library" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Help */}
            <TouchableOpacity style={styles.controlButton} onPress={() => setHelpVisible(true)}>
              <MaterialIcons name="help-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          {scanned && !loading && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => { setScanned(false); setLoading(false); }}
            >
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.rescanText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>

      <BottomNavBar role="worker" activeTab="ShowQR" />

      {/* ── Help Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={helpVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHelpVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <MaterialIcons name="help-outline" size={28} color={colors.primary} />
                <Text style={styles.modalTitle}>How to Scan QR</Text>
              </View>
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

              <View style={[styles.helpStep, { marginBottom: 0 }]}>
                <View style={[styles.helpStepIconWrap, { backgroundColor: '#FDF4E6', borderColor: '#FEF3C7' }]}>
                  <MaterialIcons name="support-agent" size={24} color="#D97706" />
                </View>
                <View style={styles.helpStepText}>
                  <Text style={[styles.helpStepTitle, { color: '#D97706' }]}>Need Support?</Text>
                  <Text style={styles.helpStepDesc}>Contact your group leader if you face any issues while scanning.</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setHelpVisible(false)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={colors.primaryGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.modalDoneGradient}
              >
                <Text style={styles.modalDoneText}>GOT IT!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionText: { color: '#fff', fontSize: 16, marginTop: 16, textAlign: 'center', fontWeight: '600' },
  retryButton: {
    marginTop: 24, backgroundColor: colors.primary,
    paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 15, elevation: 10,
  },
  retryButtonText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#131811',
    letterSpacing: 2,
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  instructionContainer: {
    alignItems: 'center',
    marginTop: 20,
    zIndex: 10,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },

  // Scanner
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scannerFrame: {
    width: 280,
    height: 280,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary,
    borderWidth: 6,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 40 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 40 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 40 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 40 },
  scanLine: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    height: 40,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Success
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22,34,16,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successIcon: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    padding: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 32,
    letterSpacing: 1,
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    fontWeight: '600',
  },

  // Controls
  controls: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
    zIndex: 100,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  controlButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },

  // Modal styling - Premium
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#131811', letterSpacing: -0.5 },
  modalClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  helpStep: { flexDirection: 'row', marginBottom: 24, gap: 16 },
  helpStepIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  helpStepText: { flex: 1 },
  helpStepTitle: { fontSize: 17, fontWeight: '800', color: '#131811', marginBottom: 4 },
  helpStepDesc: { fontSize: 14, color: '#6B7280', lineHeight: 22, fontWeight: '500' },
  modalDoneButton: {
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  modalDoneGradient: {
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDoneText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
});

export default QRScannerScreen;
