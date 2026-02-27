// Screen 4: OTP Verification - Exact match to otp-verification.html
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../../services/api/authService';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';

const OTPScreen = ({ navigation, route }) => {
  const { phone, otp: receivedOTP, name, village, role, fromRegister } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const verifyOTPAction = useAuthStore((state) => state.verifyOTP);
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';

  useEffect(() => {

    // Display the OTP to the user
    if (receivedOTP) {
      Alert.alert(
        'Your OTP Code',
        `Enter this code: ${receivedOTP}`,
        [{ text: 'OK' }]
      );
    }
  }, [receivedOTP]);

  const handleNumberPress = (num) => {
    if (otp.length < 4) {
      const newOtp = otp + num;
      setOtp(newOtp);
      // Auto-verify when 4 digits entered
      if (newOtp.length === 4) {
        setTimeout(() => verifyOTP(newOtp), 300);
      }
    }
  };

  const handleBackspace = () => {
    setOtp(otp.slice(0, -1));
  };

  const verifyOTP = async (otpToVerify = otp) => {
    if (otpToVerify.length !== 4) {
      Alert.alert('Error', 'Please enter a 4-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // Pass registration data (name/village/role) only for new registrations
      const registrationData = fromRegister
        ? { name, village, role }
        : {};
      await verifyOTPAction(phone, otpToVerify, registrationData);
    } catch (error) {
      console.error('Verify OTP Error:', error);
      Alert.alert('Error', 'Invalid OTP. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      const response = await authService.sendOTP(phone);
      if (response.success) {
        Alert.alert('Success', 'OTP sent successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP');
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
        <View style={{ height: 40 }} />

        {/* OTP Input Section */}
        <View style={styles.otpInputSection}>
          <View style={styles.labelRow}>
            <MaterialIcons name="security" size={20} color={colors.primary} />
            <Text style={styles.label}>VERIFICATION CODE</Text>
          </View>

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

          {receivedOTP && (
            <View style={styles.otpDisplayContainer}>
              <Text style={styles.otpDisplayLabel}>YOUR OTP CODE</Text>
              <Text style={styles.otpDisplayCode}>{receivedOTP}</Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }} />

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
                <ActivityIndicator color={colors.backgroundDark} />
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                  <MaterialIcons name="arrow-forward" size={24} color={colors.backgroundDark} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendQuestion}>Didn't receive code?</Text>
              <TouchableOpacity onPress={handleResendOTP}>
                <Text style={styles.resendButton}>Resend OTP</Text>
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
  otpInputSection: { paddingHorizontal: 24, paddingVertical: 24, alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', color: '#6f8961', letterSpacing: 2 },
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
  otpDisplayContainer: {
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    marginTop: 8,
  },
  otpDisplayLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  otpDisplayCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 8,
  },
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
  verifyButtonText: { fontSize: 20, fontWeight: 'bold', color: colors.backgroundDark },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  resendQuestion: {
    fontSize: 14,
    color: '#6f8961',
  },
  resendButton: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default OTPScreen;
