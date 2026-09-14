// Screen 4: OTP Verification
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomLoader from '../../components/CustomLoader';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';

const OTPScreen = ({ navigation, route }) => {
  const { phone, otp: receivedOTP, name, village, role, age, gender, fromRegister } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  // M13: Resend cooldown timer (120 seconds matching the backend 2-min window)
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null); // inline error — no alert popups
  // Track the current dev OTP — updates on Resend so the banner always shows the latest code
  const [currentDevOtp, setCurrentDevOtp] = useState(receivedOTP || null);
  const verifyOTPAction = useAuthStore((state) => state.verifyOTP);
  const sendOTPAction = useAuthStore((state) => state.sendOTP);
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';

  // Pulse animation for the dev OTP banner to draw the tester's eye
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!currentDevOtp) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [currentDevOtp]);

  // M13: Count down the resend timer every second
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const handleNumberPress = (num) => {
    if (otp.length < 4) {
      setErrorMsg(null);
      const newOtp = otp + num;
      setOtp(newOtp);
      // Auto-verify immediately when 4th digit is entered
      if (newOtp.length === 4) {
        verifyOTP(newOtp);
      }
    }
  };

  const handleBackspace = () => {
    setOtp(otp.slice(0, -1));
  };

  // Developer convenience: auto-fill the OTP boxes and verify immediately
  const handleAutoFill = () => {
    if (!currentDevOtp) return;
    setOtp(currentDevOtp);
    verifyOTP(currentDevOtp);
  };

  const verifyOTP = async (otpToVerify = otp) => {
    if (otpToVerify.length !== 4) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const registrationData = fromRegister ? { name, village, role, age, gender } : {};
      await verifyOTPAction(phone, otpToVerify, registrationData);
      setAttemptsRemaining(null);
    } catch (error) {
      // Show inline error — no Alert popup that says "OTP failed"
      const serverData = error?.response?.data;
      if (serverData?.locked) {
        setErrorMsg('Too many attempts. Request a new OTP.');
        setResendCooldown(0);
      } else if (serverData?.attemptsRemaining != null) {
        setAttemptsRemaining(serverData.attemptsRemaining);
        setErrorMsg(`Wrong OTP — ${serverData.attemptsRemaining} attempt${serverData.attemptsRemaining !== 1 ? 's' : ''} left.`);
      } else {
        setErrorMsg('Incorrect OTP. Please try again.');
      }
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return; // M13: ignore tap during cooldown
    try {
      const response = await sendOTPAction(phone);
      const newOtp = response?.devOtp;
      // M13: Start 120-second cooldown matching backend rate limit
      setResendCooldown(120);
      setAttemptsRemaining(null); // reset attempt counter display
      if (newOtp) {
        // Update the on-screen banner with the latest OTP — no Alert needed
        setCurrentDevOtp(newOtp);
      } else {
        Alert.alert('OTP Resent', 'OTP sent successfully. Check your SMS.');
      }
    } catch (error) {
      // Handle rate limit cooldown from store
      if (error.code === 'RATE_LIMIT_COOLDOWN') {
        setResendCooldown(error.remainingSeconds);
        Alert.alert('Too soon', `Please wait ${error.remainingSeconds}s before requesting a new OTP.`);
      } else {
        Alert.alert('Error', 'Failed to resend OTP. Please try again.');
      }
    }
  };

  const keypadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [null, '0', 'backspace'],
  ];

  const otpBoxes = [0, 1, 2, 3].map((index) => {
    const digit = otp[index];
    const isFilled = digit !== undefined;
    return { index, digit: digit || '_', isFilled };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── OTP Input Section — label, then dev banner, then OTP boxes ── */}
        <View style={styles.otpInputSection}>
          <View style={styles.labelRow}>
            <MaterialIcons name="security" size={20} color={colors.primary} />
            <Text style={styles.label}>VERIFICATION CODE</Text>
          </View>

          {/* ── Developer OTP Banner — only visible when SHOW_OTP_ON_SCREEN=true ── */}
          {currentDevOtp && (
            <Animated.View style={[styles.devBanner, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.devBannerHeader}>
                <MaterialIcons name="developer-mode" size={16} color="#92400e" />
                <Text style={styles.devBannerTitle}>DEV MODE — OTP ON SCREEN</Text>
              </View>
              <Text style={styles.devBannerOtp}>{currentDevOtp}</Text>
              <Text style={styles.devBannerSub}>SMS is disabled. Use the code above.</Text>
              <TouchableOpacity style={styles.autoFillBtn} onPress={handleAutoFill} activeOpacity={0.8}>
                <MaterialIcons name="flash-on" size={16} color="#fff" />
                <Text style={styles.autoFillBtnText}>Tap to Auto-fill & Verify</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          <View style={styles.otpBoxRow}>
            {otpBoxes.map(({ index, digit, isFilled }) => (
              <View
                key={index}
                style={[
                  styles.otpBox,
                  isFilled && styles.otpBoxFilled,
                ]}
              >
                <Text style={[styles.otpDigit, !isFilled && styles.otpDigitEmpty]}>
                  {digit === '_' ? '' : digit}
                </Text>
                {!isFilled && <View style={styles.cursor} />}
              </View>
            ))}
          </View>

          {/* Master Test OTP 1234 Banner */}
          <TouchableOpacity
            style={styles.masterOtpBanner}
            onPress={() => {
              setOtp('1234');
              verifyOTP('1234');
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="bolt" size={20} color="#F59E0B" />
            <Text style={styles.masterOtpText}>
              Test OTP: <Text style={{ fontWeight: 'bold', color: colors.primary }}>1234</Text> (Tap to Auto-Fill)
            </Text>
          </TouchableOpacity>

          {errorMsg && (
            <View style={styles.inlineErrorContainer}>
              <MaterialIcons name="error-outline" size={16} color="#DC2626" />
              <Text style={styles.inlineErrorText}>{errorMsg}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 16 }} />

        {/* Custom Numeric Keypad */}
        <View style={styles.keypadContainer}>
          <View style={styles.keypad}>
            {keypadNumbers.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((key, keyIndex) => {
                  if (key === null) {
                    return <View key={keyIndex} style={styles.keypadKey} />;
                  }
                  if (key === 'backspace') {
                    return (
                      <TouchableOpacity
                        key={keyIndex}
                        style={[styles.keypadKey, styles.keypadKeyActive]}
                        onPress={handleBackspace}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="backspace" size={36} color="#EF4444" />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={keyIndex}
                      style={[styles.keypadKey, styles.keypadKeyActive]}
                      onPress={() => handleNumberPress(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keypadKeyText}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Attempts remaining warning */}
          {attemptsRemaining != null && (
            <View style={styles.attemptsWarning}>
              <MaterialIcons name="warning" size={14} color="#DC2626" />
              <Text style={styles.attemptsWarningText}>
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} left before lockout
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (otp.length !== 4 || loading) && styles.verifyButtonDisabled,
              ]}
              onPress={() => verifyOTP()}
              disabled={otp.length !== 4 || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <CustomLoader size={20} color={colors.backgroundDark} />
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                  <MaterialIcons name="arrow-forward" size={24} color={colors.backgroundDark} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendQuestion}>Didn't receive code?</Text>
              {/* M13: Show countdown instead of tappable link during cooldown */}
              <TouchableOpacity onPress={handleResendOTP} disabled={resendCooldown > 0}>
                <Text style={[styles.resendButton, resendCooldown > 0 && styles.resendButtonDisabled]}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // ── Dev OTP Banner — sits between label and OTP boxes ──────────────────
  devBanner: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#fffbeb',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  devBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  devBannerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
    letterSpacing: 1.5,
  },
  devBannerOtp: {
    fontSize: 52,
    fontWeight: '900',
    color: '#b45309',
    letterSpacing: 14,
    marginBottom: 6,
  },
  devBannerSub: {
    fontSize: 12,
    color: '#78350f',
    marginBottom: 14,
    opacity: 0.8,
  },
  autoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 9999,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  autoFillBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // ── OTP Boxes ─────────────────────────────────────────────────────────────
  otpInputSection: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 32 : 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', color: '#6f8961', letterSpacing: 2 },
  otpBoxRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  otpBox: {
    width: 68,
    height: 84,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#dfe6db',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  otpDigit: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#131811',
  },
  otpDigitEmpty: {
    color: '#dfe6db',
  },
  cursor: {
    position: 'absolute',
    bottom: 16,
    width: 20,
    height: 3,
    backgroundColor: `${colors.primary}4D`,
    borderRadius: 2,
  },
  inlineErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  inlineErrorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  masterOtpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  masterOtpText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
  },

  // ── Keypad ────────────────────────────────────────────────────────────────
  keypadContainer: { padding: 16 },
  keypad: { gap: 12 },
  keypadRow: { flexDirection: 'row', gap: 12 },
  keypadKey: { flex: 1, height: 80, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  keypadKeyActive: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#dfe6db',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  keypadKeyText: { fontSize: 30, fontWeight: 'bold', color: '#131811' },
  buttonContainer: { paddingHorizontal: 8, paddingTop: 24, paddingBottom: 40 },
  verifyButton: {
    flexDirection: 'row', height: 64, borderRadius: 9999, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 16,
  },
  verifyButtonDisabled: { opacity: 0.5 },
  verifyButtonText: { fontSize: 22, fontWeight: 'bold', color: colors.backgroundDark },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  resendQuestion: {
    fontSize: 16,
    color: '#6f8961',
  },
  resendButton: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  // M13: Disabled resend style during cooldown
  resendButtonDisabled: {
    color: '#9CA3AF',
    textDecorationLine: 'none',
  },
  // S3: Attempts remaining warning bar
  attemptsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    marginBottom: 12,
  },
  attemptsWarningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
});

export default OTPScreen;
