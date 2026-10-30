// Screen 4: OTP Verification – Production-ready, bottom-to-top layout
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomLoader from '../../components/CustomLoader';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';

const OTPScreen = ({ navigation, route }) => {
  const { phone, name, village, role, age, gender, fromRegister, devOtp, otp: paramOtp } = route?.params || {};
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  // Track dev/fallback OTP if provided by backend or params
  const [currentDevOtp, setCurrentDevOtp] = useState(devOtp || paramOtp || null);
  // Resend cooldown timer (120 seconds matching the backend 2-min window)
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null); // inline error — no alert popups
  const verifyOTPAction = useAuthStore((state) => state.verifyOTP);
  const sendOTPAction = useAuthStore((state) => state.sendOTP);
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';

  // Count down the resend timer every second
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

  const verifyOTP = async (otpToVerify = otp) => {
    if (otpToVerify.length !== 4) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const registrationData = fromRegister ? { name, village, role, age, gender } : {};
      await verifyOTPAction(phone, otpToVerify, registrationData);
      setAttemptsRemaining(null);
    } catch (error) {
      // Show inline error — no Alert popup
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
    if (resendCooldown > 0) return; // ignore tap during cooldown
    try {
      const result = await sendOTPAction(phone);
      if (result?.devOtp) {
        setCurrentDevOtp(result.devOtp);
      }
      // Start 120-second cooldown matching backend rate limit
      setResendCooldown(120);
      setAttemptsRemaining(null); // reset attempt counter display
      setErrorMsg(null);
      Alert.alert('OTP Resent', 'A new OTP has been sent to your phone via SMS.');
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
    const isNext = index === otp.length;
    return { index, digit: digit || '', isFilled, isNext };
  });

  // Masked phone for display: 98****7890
  const maskedPhone = phone
    ? phone.slice(0, 2) + '••••' + phone.slice(6)
    : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Top Section: Title & OTP Boxes ── */}
        <View style={styles.topSection}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.shieldIcon}>
              <MaterialIcons name="verified-user" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>Verify Your Number</Text>
            <Text style={styles.subtitle}>
              Enter the 4-digit code sent to{'\n'}
              <Text style={styles.phoneHighlight}>+91 {maskedPhone}</Text>
            </Text>
          </View>

          {/* ── Fallback/Dev OTP helper banner ── */}
          {currentDevOtp && (
            <TouchableOpacity
              style={styles.devOtpBanner}
              onPress={() => {
                setOtp(currentDevOtp);
                verifyOTP(currentDevOtp);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.devOtpLeft}>
                <MaterialIcons name="sms" size={18} color={colors.primary} />
                <Text style={styles.devOtpBannerText}>
                  OTP Code: <Text style={styles.devOtpCode}>{currentDevOtp}</Text>
                </Text>
              </View>
              <View style={styles.tapToFillBadge}>
                <Text style={styles.tapToFillText}>Tap to autofill</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── OTP Input Boxes (large, prominent) ── */}
          <View style={styles.otpBoxRow}>
            {otpBoxes.map(({ index, digit, isFilled, isNext }) => (
              <View
                key={index}
                style={[
                  styles.otpBox,
                  isFilled && styles.otpBoxFilled,
                  isNext && styles.otpBoxActive,
                  errorMsg && styles.otpBoxError,
                ]}
              >
                <Text style={[styles.otpDigit, !isFilled && styles.otpDigitEmpty]}>
                  {digit || ''}
                </Text>
                {isNext && !errorMsg && <View style={styles.cursor} />}
              </View>
            ))}
          </View>

          {/* ── Error Message ── */}
          {errorMsg && (
            <View style={styles.inlineErrorContainer}>
              <MaterialIcons name="error-outline" size={18} color="#DC2626" />
              <Text style={styles.inlineErrorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Attempts remaining warning */}
          {attemptsRemaining != null && !errorMsg && (
            <View style={styles.attemptsWarning}>
              <MaterialIcons name="warning" size={14} color="#DC2626" />
              <Text style={styles.attemptsWarningText}>
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} left before lockout
              </Text>
            </View>
          )}
        </View>

        {/* ── Spacer to push keypad down ── */}
        <View style={{ flex: 1 }} />

        {/* ── Bottom Section: Keypad + Verify Button ── */}
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

  // ── Top Section ─────────────────────────────────────────────────────────
  topSection: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe6db',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  shieldIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#131811',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneHighlight: {
  // ── Dev / Fallback OTP Banner ───────────────────────────────────────────
  devOtpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}40`,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
    width: '100%',
  },
  devOtpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devOtpBannerText: {
    fontSize: 15,
    color: '#2D3748',
    fontWeight: '600',
  },
  devOtpCode: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
  },
  tapToFillBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tapToFillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.backgroundDark,
  },

  // ── OTP Boxes (enlarged) ──────────────────────────────────────────────────
  otpBoxRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  otpBox: {
    width: 76,
    height: 96,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#dfe6db',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  otpBoxActive: {
    borderColor: `${colors.primary}80`,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  otpBoxError: {
    borderColor: '#FCA5A5',
  },
  otpDigit: {
    fontSize: 42,
    fontWeight: '900',
    color: '#131811',
  },
  otpDigitEmpty: {
    color: '#dfe6db',
  },
  cursor: {
    position: 'absolute',
    bottom: 18,
    width: 24,
    height: 3,
    backgroundColor: `${colors.primary}60`,
    borderRadius: 2,
  },

  // ── Error / Warning ────────────────────────────────────────────────────
  inlineErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  inlineErrorText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
  attemptsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },
  attemptsWarningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },

  // ── Keypad ─────────────────────────────────────────────────────────────
  keypadContainer: { padding: 16 },
  keypad: { gap: 12 },
  keypadRow: { flexDirection: 'row', gap: 12 },
  keypadKey: { flex: 1, height: 80, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  keypadKeyActive: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#dfe6db',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  keypadKeyText: { fontSize: 30, fontWeight: 'bold', color: '#131811' },

  // ── Buttons ────────────────────────────────────────────────────────────
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
  resendButtonDisabled: {
    color: '#9CA3AF',
    textDecorationLine: 'none',
  },
});

export default OTPScreen;
