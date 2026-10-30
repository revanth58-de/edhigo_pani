// Screen 3: Login (Phone Entry) – Production-ready, bottom-to-top layout
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import CustomLoader from '../../components/CustomLoader';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';

const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showNotRegisteredModal, setShowNotRegisteredModal] = useState(false);
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState(0);
  const sendOTP = useAuthStore((state) => state.sendOTP);
  const { t } = useTranslation();

  // Handle OTP cooldown countdown
  useEffect(() => {
    if (otpCooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setOtpCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [otpCooldownSeconds]);

  const handleNumberPress = (num) => {
    if (phone.length < 10) {
      const newPhone = phone.slice(0, cursorPos) + num + phone.slice(cursorPos);
      setPhone(newPhone);
      setCursorPos(cursorPos + 1);
    }
  };

  const handleBackspace = () => {
    if (cursorPos > 0) {
      const newPhone = phone.slice(0, cursorPos - 1) + phone.slice(cursorPos);
      setPhone(newPhone);
      setCursorPos(cursorPos - 1);
    }
  };

  const handleContinue = async () => {
    if (phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const result = await sendOTP(phone);

      if (!result?.isExistingUser) {
        setShowNotRegisteredModal(true);
        return;
      }

      // Navigate to OTP screen — pass devOtp as fallback for test/dev/SMS failure
      navigation.navigate('OTP', {
        phone: phone,
        fromRegister: false,
        devOtp: result?.devOtp,
      });
    } catch (error) {
      const errMsg = error?.response?.data?.error
        || error?.message
        || 'Failed to send OTP. Please try again.';

      // Handle rate limit cooldown from backend
      if (error?.response?.status === 429 || error?.code === 'RATE_LIMIT_COOLDOWN') {
        const remaining = error?.response?.data?.retryAfterSeconds || error?.remainingSeconds || 120;
        setOtpCooldownSeconds(remaining);
        Alert.alert('Please Wait', `You can request a new OTP in ${remaining} seconds.`);
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (num) => {
    if (num.length <= 4) return num;
    return `${num.slice(0, 4)} ${num.slice(4)}`;
  };

  const keypadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [null, '0', 'backspace'],
  ];

  return (
    <View style={{ flex: 1 }}>
      <Modal
        transparent
        animationType="fade"
        visible={showNotRegisteredModal}
        onRequestClose={() => setShowNotRegisteredModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <MaterialIcons name="person-add" size={52} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Not Registered Yet!</Text>
            <Text style={styles.modalBody}>
              This phone number is not registered.{'\n'}Please register first to create your account.
            </Text>
            <TouchableOpacity
              style={styles.modalRegisterBtn}
              onPress={() => {
                setShowNotRegisteredModal(false);
                navigation.navigate('Register');
              }}
            >
              <MaterialIcons name="app-registration" size={22} color="#FFFFFF" />
              <Text style={styles.modalRegisterBtnText}>Register Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalDismissBtn}
              onPress={() => setShowNotRegisteredModal(false)}
            >
              <Text style={styles.modalDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Top Area: Brand & Welcome Header ── */}
          <View style={styles.topBrandSection}>
            <View style={styles.brandBadge}>
              <MaterialIcons name="agriculture" size={22} color={colors.primary} />
              <Text style={styles.brandBadgeText}>DINASARI</Text>
            </View>
            <Text style={styles.screenTitle}>Welcome Back</Text>
            <Text style={styles.screenSubtitle}>
              Enter your mobile number to get OTP
            </Text>
          </View>

          {/* Spacer pushing the interactive dialpad section to the bottom */}
          <View style={{ flex: 1, minHeight: 16 }} />

          {/* ── Bottom Section (Arranged from bottom to top) ── */}
          <View style={styles.bottomSection}>
            {/* ── Heading: Phone Number directly on top of the input box ── */}
            <View style={styles.headingRow}>
              <MaterialIcons name="phone-iphone" size={20} color={colors.primary} />
              <Text style={styles.headingText}>{t('auth.phoneNumber') || 'Phone Number'}</Text>
            </View>

            {/* ── Input Box of Mobile Number directly above the dial pad ── */}
            <View style={styles.inputBoxContainer}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryFlag}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <View style={styles.inputDivider} />
              <View style={styles.phoneDisplayRow}>
                {phone.length === 0 ? (
                  <Text style={styles.phonePlaceholder}>00000 00000</Text>
                ) : (
                  phone.split('').map((char, index) => (
                    <React.Fragment key={index}>
                      {index === cursorPos && <View style={styles.activeCursor} />}
                      {index === 5 && <View style={{ width: 8 }} />}
                      <TouchableOpacity onPress={() => setCursorPos(index)} activeOpacity={0.7}>
                        <Text style={[styles.phoneDigit, cursorPos === index && styles.activeChar]}>
                          {char}
                        </Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))
                )}
                {phone.length > 0 && cursorPos === phone.length && (
                  <View style={styles.activeCursor} />
                )}
                {phone.length > 0 && (
                  <TouchableOpacity style={styles.ghostTap} onPress={() => setCursorPos(phone.length)} />
                )}
              </View>
              {phone.length > 0 && (
                <TouchableOpacity
                  onPress={() => { setPhone(''); setCursorPos(0); }}
                  style={styles.clearBtn}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="cancel" size={22} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* ── Dial Pad (Custom Keypad) ── */}
            <View style={styles.keypad}>
              {keypadNumbers.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.keypadRow}>
                  {row.map((key, keyIndex) => {
                    if (key === null) return <View key={keyIndex} style={styles.keypadKey} />;
                    if (key === 'backspace') {
                      return (
                        <TouchableOpacity
                          key={keyIndex}
                          style={[styles.keypadKey, styles.keypadKeyActive]}
                          onPress={handleBackspace}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="backspace" size={32} color="#EF4444" />
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

            {/* ── Send OTP Button ── */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  (phone.length !== 10 || otpCooldownSeconds > 0) && styles.continueButtonDisabled,
                ]}
                onPress={handleContinue}
                disabled={loading || phone.length !== 10 || otpCooldownSeconds > 0}
                activeOpacity={0.9}
              >
                {loading ? (
                  <CustomLoader size={24} color={colors.backgroundDark} />
                ) : otpCooldownSeconds > 0 ? (
                  <>
                    <MaterialIcons name="schedule" size={24} color={colors.backgroundDark} />
                    <Text style={styles.continueButtonText}>{t('auth.sendOTP')} ({otpCooldownSeconds}s)</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.continueButtonText}>{t('auth.sendOTP')}</Text>
                    <MaterialIcons name="arrow-forward" size={24} color={colors.backgroundDark} />
                  </>
                )}
              </TouchableOpacity>

              {/* ── Register Link ── */}
              <TouchableOpacity
                style={styles.registerLink}
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.7}
              >
                <View style={styles.registerLinkInner}>
                  <MaterialIcons name="person-add" size={22} color={colors.primary} />
                  <Text style={styles.registerLinkPrefix}>New user? </Text>
                  <Text style={styles.registerLinkCta}>Register here</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundLight },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between' },

  // ── Top Header Brand ──────────────────────────────────────────────────────
  topBrandSection: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 12,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  brandBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.5,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#131811',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#6f8961',
    marginTop: 4,
    fontWeight: '500',
  },

  // ── Bottom Section (Bottom-to-Top Layout) ──────────────────────────────────
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },

  // ── Heading: Phone Number (directly on top of input box) ─────────────────
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  headingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ── Input Box of Mobile Number (directly above dial pad) ──────────────────
  inputBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: `${colors.primary}50`,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCodeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
  },
  inputDivider: {
    width: 1.5,
    height: 28,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  phoneDisplayRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  phonePlaceholder: {
    fontSize: 24,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 2,
  },
  phoneDigit: {
    fontSize: 24,
    fontWeight: '800',
    color: '#131811',
    letterSpacing: 1.5,
  },
  activeCursor: {
    width: 2.5,
    height: 26,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  activeChar: {
    color: colors.primary,
  },
  ghostTap: {
    position: 'absolute',
    right: 0,
    width: 40,
    height: 44,
  },
  clearBtn: {
    padding: 6,
  },

  // ── Keypad (Dial Pad) ────────────────────────────────────────────────────
  keypad: {
    gap: 10,
    marginBottom: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keypadKey: {
    flex: 1,
    height: 68,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadKeyActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  keypadKeyText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#131811',
  },

  // ── Buttons ──────────────────────────────────────────────────────────────
  buttonContainer: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  continueButton: {
    flexDirection: 'row',
    height: 60,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButtonDisabled: {
    opacity: 0.45,
    elevation: 0,
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.backgroundDark,
  },

  // ── Register Link ────────────────────────────────────────────────────────
  registerLink: {
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: `${colors.primary}0D`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerLinkInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  registerLinkPrefix: {
    fontSize: 16,
    color: '#6f8961',
    fontWeight: '500',
  },
  registerLinkCta: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  // ── Not Registered Modal ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 20,
  },
  modalIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#131811',
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalRegisterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 9999,
    width: '100%',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  modalRegisterBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalDismissBtn: {
    paddingVertical: 8,
  },
  modalDismiss: {
    fontSize: 15,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
