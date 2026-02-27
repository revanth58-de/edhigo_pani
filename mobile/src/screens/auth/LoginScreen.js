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
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';

const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNotRegisteredModal, setShowNotRegisteredModal] = useState(false);
  const sendOTP = useAuthStore((state) => state.sendOTP);
  const { t } = useTranslation();

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
      const result = await sendOTP(phone);

      if (!result?.isExistingUser) {
        setShowNotRegisteredModal(true);
        return;
      }

      navigation.navigate('OTP', {
        phone: phone,
        otp: result?.otp,
        fromRegister: false,
      });
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
    <View style={{ flex: 1 }}>
      <Modal
        transparent
        animationType="fade"
        visible={showNotRegisteredModal}
        onRequestClose={() => setShowNotRegisteredModal(false)}
      >
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
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
          </div>
        </div>
      </Modal>

      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.displaySection}>
            <View style={styles.labelRow}>
              <MaterialIcons name="phone-iphone" size={20} color={colors.primary} />
              <Text style={styles.label}>{t('auth.phoneNumber')}</Text>
            </View>
            <Text style={[styles.phoneDisplay, phone.length === 0 && { color: '#9CA3AF' }]}>
              {phone.length === 0 ? '0000 000000' : formatPhone(phone)}
            </Text>
            <View style={styles.displayUnderline} />
          </View>

          <View style={{ height: 16 }} />

          <View style={styles.keypadContainer}>
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
                    <Text style={styles.continueButtonText}>{t('auth.sendOTP')}</Text>
                    <MaterialIcons name="arrow-forward" size={24} color={colors.backgroundDark} />
                  </>
                )}
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
  scrollContent: { flexGrow: 1 },
  displaySection: { paddingHorizontal: 24, paddingTop: 220, paddingBottom: 24, alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '500', color: '#6f8961', letterSpacing: 2 },
  phoneDisplay: { fontSize: 40, fontWeight: 'bold', color: '#131811', letterSpacing: 4, paddingVertical: 16 },
  displayUnderline: { width: '100%', height: 2, backgroundColor: `${colors.primary}4D` },
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
  continueButton: {
    flexDirection: 'row', height: 64, borderRadius: 9999, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 16,
  },
  continueButtonDisabled: { opacity: 0.5 },
  continueButtonText: { fontSize: 20, fontWeight: 'bold', color: colors.backgroundDark },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 32, alignItems: 'center', width: '100%', gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.3, shadowRadius: 32, elevation: 20 },
  modalIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: `${colors.primary}15`, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#131811', textAlign: 'center' },
  modalBody: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24 },
  modalRegisterBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primary, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 9999, width: '100%', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 10 },
  modalRegisterBtnText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  modalDismissBtn: { paddingVertical: 8 },
  modalDismiss: { fontSize: 15, color: '#9CA3AF', textDecorationLine: 'underline' },
});

export default LoginScreen;
