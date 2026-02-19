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
import * as Speech from 'expo-speech';
import { authService } from '../../services/api/authService';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';

const OTPScreen = ({ navigation, route }) => {
  const { phone, otp: receivedOTP, name, village, role, fromRegister } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const verifyOTPAction = useAuthStore((state) => state.verifyOTP);

  useEffect(() => {
    Speech.speak('OTP enter cheyyandi. Enter the 4-digit code', { language: 'te' });

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
      Speech.speak('OTP verified successfully', { language: 'en' });
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
        Speech.speak('New OTP sent', { language: 'en' });
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
        {/* Voice Guidance Header */}
        <View style={styles.header}>
          <View style={styles.voiceIcon}>
            <MaterialIcons name="volume-up" size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>OTP enter cheyyandi</Text>
          <Text style={styles.subtitle}>Enter the 4-digit code</Text>
        </View>

        {/* Display OTP Code on Screen */}
        {receivedOTP && (
          <View style={styles.otpDisplayContainer}>
            <Text style={styles.otpDisplayLabel}>YOUR OTP CODE</Text>
            <Text style={styles.otpDisplayCode}>{receivedOTP}</Text>
          </View>
        )}

        {/* OTP Input Display */}
        <View style={styles.otpContainer}>
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
                  {digit}
                </Text>
              </View>
            ))}
          </View>

          {/* Verify Button and Resend */}
          <View style={styles.actionsContainer}>
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
                  <Text style={styles.verifyButtonText}>Verify</Text>
                  <MaterialIcons name="check-circle" size={24} color={colors.backgroundDark} />
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

        {/* Keypad */}
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
                        style={[styles.keypadKey, styles.keypadKeyActive, styles.backspaceKey]}
                        onPress={handleBackspace}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="backspace" size={40} color="#EF4444" />
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
          <View style={{ height: 24 }} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  voiceIcon: {
    backgroundColor: `${colors.primary}33`,
    padding: 16,
    borderRadius: 9999,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#131811',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6f8961',
  },
  otpDisplayContainer: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  otpDisplayLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  otpDisplayCode: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 12,
  },
  otpContainer: {
    flex: 1,
    paddingVertical: 32,
    alignItems: 'center',
  },
  otpBoxRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  otpBox: {
    width: 64,
    height: 80,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#dfe6db',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderWidth: 4,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  otpDigit: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#131811',
  },
  otpDigitEmpty: {
    color: '#dfe6db',
  },
  actionsContainer: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 16,
  },
  verifyButton: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.backgroundDark,
  },
  resendContainer: {
    alignItems: 'center',
    gap: 4,
  },
  resendQuestion: {
    fontSize: 14,
    color: '#6f8961',
  },
  resendButton: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  keypadContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 20,
  },
  keypad: {
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 16,
  },
  keypadKey: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadKeyActive: {
    backgroundColor: colors.backgroundLight,
  },
  backspaceKey: {
    backgroundColor: '#ffebeb',
  },
  keypadKeyText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#131811',
  },
});

export default OTPScreen;
