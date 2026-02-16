// Screen 3: Login (Phone Entry) - Exact match to login-phone-entry.html
import React, { useState, useEffect } from 'react';
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
import { colors } from '../../theme/colors';

const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Speech.speak('Mobile number enter cheyyandi', { language: 'te' });
  }, []);

  const handleVoiceGuidance = () => {
    Speech.speak('Enter your 10-digit mobile number using the keypad below', {
      language: 'en',
    });
  };

  const handleNumberPress = (num) => {
    if (phone.length < 10) {
      setPhone(phone + num);
    }
  };

  const handleBackspace = () => {
    setPhone(phone.slice(0, -1));
  };

  const handleContinue = async () => {
    if (phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;
      const response = await authService.sendOTP(fullPhone);
      
      if (response.success) {
        Speech.speak('OTP sent successfully', { language: 'en' });
        // OTP is in response.data.otp because authService wraps it
        navigation.navigate('OTP', { 
          phone: fullPhone, 
          otp: response.data.otp 
        });
      } else {
        Alert.alert('Error', response.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP Error:', error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

      {/* Voice Guidance Bar */}
      <View style={styles.voiceBar}>
        <View style={styles.voiceBarInner}>
          <View>
            <Text style={styles.voiceTitle}>Mobile number enter cheyyandi</Text>
            <Text style={styles.voiceSubtitle}>Tap speaker to hear</Text>
          </View>
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={handleVoiceGuidance}
            activeOpacity={0.8}
          >
            <MaterialIcons name="volume-up" size={30} color={colors.backgroundDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Phone Number Display */}
      <View style={styles.displaySection}>
        <View style={styles.labelRow}>
          <MaterialIcons name="phone-iphone" size={20} color={colors.primary} />
          <Text style={styles.label}>PHONE NUMBER</Text>
        </View>
        <Text style={styles.phoneDisplay}>
          {phone.length === 0 ? '0000 000000' : formatPhone(phone)}
        </Text>
        <View style={styles.displayUnderline} />
      </View>

      {/* Spacer */}
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

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              phone.length !== 10 && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={loading || phone.length !== 10}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={colors.backgroundDark} />
            ) : (
              <>
                <Text style={styles.continueButtonText}>Continue</Text>
                <MaterialIcons name="arrow-forward" size={24} color={colors.backgroundDark} />
              </>
            )}
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  voiceBar: {
    padding: 16,
    paddingTop: 32,
  },
  voiceBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dfe6db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 16,
  },
  voiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 4,
  },
  voiceSubtitle: {
    fontSize: 14,
    color: '#6f8961',
  },
  voiceButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  displaySection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6f8961',
    letterSpacing: 2,
  },
  phoneDisplay: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#131811',
    letterSpacing: 4,
    paddingVertical: 16,
  },
  displayUnderline: {
    width: '100%',
    height: 2,
    backgroundColor: `${colors.primary}4D`, // 30% opacity
  },
  keypadContainer: {
    padding: 16,
  },
 keypad: {
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  keypadKey: {
    flex: 1,
    height: 80,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadKeyActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#dfe6db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  keypadKeyText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#131811',
  },
  buttonContainer: {
    paddingHorizontal: 8,
    paddingTop: 24,
    paddingBottom: 40,
  },
  continueButton: {
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
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.backgroundDark,
  },
});

export default LoginScreen;
