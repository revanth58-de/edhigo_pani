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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { attendanceService } from '../../services/api/attendanceService';
import useAuthStore from '../../store/authStore';
import * as Location from 'expo-location';
import BottomNavBar from '../../components/BottomNavBar';

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
            <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCard}>
            <MaterialIcons name="qr-code-scanner" size={26} color={colors.primary} />
            <Text style={styles.headerTitle}>QR Scan — Attendance</Text>
          </View>
          <Text style={styles.headerSubtitle}>Focus the QR code inside the green square</Text>
        </View>

        {/* Scanner frame */}
        <View style={styles.scannerContainer}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {!scanned && !loading && (
              <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]} />
            )}

            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <MaterialIcons name="center-focus-weak" size={72} color="rgba(255,255,255,0.3)" />
            )}
          </View>
          {loading && <Text style={styles.processingText}>Processing attendance…</Text>}
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
          {!scanned && !loading && (
            <View style={styles.tipCard}>
              <MaterialIcons name="info-outline" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.tipText}>
                Scan the farmer's QR code, or tap the gallery icon for a saved QR image
              </Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            {/* Flashlight */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setFlashOn(!flashOn)}
              accessibilityLabel="Toggle flashlight"
            >
              <MaterialIcons
                name={flashOn ? 'flashlight-off' : 'flashlight-on'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Help */}
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setHelpVisible(true)}
              accessibilityLabel="Open help"
            >
              <MaterialIcons name="help-outline" size={26} color={colors.backgroundDark} />
              <Text style={styles.helpButtonText}>Help / मदद</Text>
            </TouchableOpacity>

            {/* Gallery upload */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleImageUpload}
              accessibilityLabel="Upload QR from gallery"
            >
              <MaterialIcons name="photo-library" size={24} color="#FFFFFF" />
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
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {HELP_STEPS.map((step, idx) => (
                <View key={idx} style={styles.helpStep}>
                  <View style={styles.helpStepLeft}>
                    <View style={styles.helpStepNumWrap}>
                      <Text style={styles.helpStepNum}>{idx + 1}</Text>
                    </View>
                    {idx < HELP_STEPS.length - 1 && <View style={styles.helpStepLine} />}
                  </View>
                  <View style={styles.helpStepContent}>
                    <View style={styles.helpStepIconWrap}>
                      <MaterialIcons name={step.icon} size={22} color={colors.primary} />
                    </View>
                    <View style={styles.helpStepText}>
                      <Text style={styles.helpStepTitle}>{step.title}</Text>
                      <Text style={styles.helpStepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.helpNote}>
                <MaterialIcons name="support-agent" size={20} color={colors.secondary} />
                <Text style={styles.helpNoteText}>
                  Still having trouble? Contact your farmer or group leader for a new QR code.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setHelpVisible(false)}
            >
              <Text style={styles.modalDoneText}>Got it!</Text>
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
  permissionText: { color: '#fff', fontSize: 16, marginTop: 16, textAlign: 'center' },
  retryButton: {
    marginTop: 24, backgroundColor: colors.primary,
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14,
  },
  retryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },

  // Header
  header: { paddingTop: 56, paddingHorizontal: 20, alignItems: 'center', zIndex: 10 },
  backButton: {
    position: 'absolute', top: 56, left: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center',
    zIndex: 20,
  },
  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 9999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
    borderWidth: 1, borderColor: `${colors.primary}33`,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#131811' },
  headerSubtitle: {
    marginTop: 14, fontSize: 15, fontWeight: '500', color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 9999,
  },

  // Scanner
  scannerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  scannerFrame: {
    width: 264, height: 264, borderRadius: 20,
    borderWidth: 3, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 24, overflow: 'hidden',
  },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: colors.primary },
  cornerTL: { top: -3, left: -3, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 20 },
  cornerTR: { top: -3, right: -3, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 20 },
  cornerBL: { bottom: -3, left: -3, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 20 },
  cornerBR: { bottom: -3, right: -3, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 20 },
  scanLine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: colors.primary, opacity: 0.9,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 10,
  },
  processingText: { color: '#fff', marginTop: 16, fontSize: 16, fontWeight: '500' },

  // Success
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22,34,16,0.92)',
    justifyContent: 'center', alignItems: 'center', zIndex: 50,
  },
  successIcon: {
    backgroundColor: '#fff', borderRadius: 9999, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 16,
  },
  successTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 28 },
  successSubtitle: { fontSize: 18, color: 'rgba(255,255,255,0.75)', marginTop: 6 },

  // Controls
  controls: { paddingHorizontal: 24, paddingBottom: 40, gap: 16, zIndex: 10 },
  tipCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  tipText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 },
  actionButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  iconButton: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  helpButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 28, paddingVertical: 15, borderRadius: 9999,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 14,
  },
  helpButtonText: { fontSize: 18, fontWeight: '800', color: colors.backgroundDark },
  rescanButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  rescanText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Help modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32, maxHeight: '88%',
  },
  modalHandle: {
    width: 40, height: 5, backgroundColor: '#D1D5DB',
    borderRadius: 3, alignSelf: 'center', marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  modalClose: { padding: 4 },
  helpStep: { flexDirection: 'row', marginBottom: 20 },
  helpStepLeft: { alignItems: 'center', marginRight: 16, width: 32 },
  helpStepNumWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  helpStepNum: { color: '#fff', fontWeight: '800', fontSize: 14 },
  helpStepLine: { width: 2, flex: 1, backgroundColor: `${colors.primary}30`, marginTop: 4, minHeight: 20 },
  helpStepContent: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  helpStepIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  helpStepText: { flex: 1 },
  helpStepTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  helpStepDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  helpNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FDF4E6', borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#ECAE4033',
  },
  helpNoteText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  modalDoneButton: {
    marginTop: 16, backgroundColor: colors.primary,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  modalDoneText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});

export default QRScannerScreen;
