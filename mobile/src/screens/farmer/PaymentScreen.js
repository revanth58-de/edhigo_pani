import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { paymentService } from '../../services/api/paymentService';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';

const PaymentScreen = ({ navigation, route }) => {
  const { job, workers, worker } = route.params || {};
  const { t } = useTranslation();
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'cash' or 'upi'
  const [loading, setLoading] = useState(false);

  const { user, language } = useAuthStore();
  const [upiLaunched, setUpiLaunched] = useState(false); // tracks if UPI app was opened
  
  // Support either single `worker` or multiple `workers`
  let workerList = workers || (worker ? [worker] : []);
  
  // Fallback: If no explicit worker object was passed, construct it from job's embedded worker details
  if (workerList.length === 0 && job?.workerId) {
    workerList = [{
      id: job.workerId,
      name: job.workerName || 'Worker',
      phone: job.workerPhone || '',
      photoUrl: job.workerPhotoUrl || null,
    }];
  }

  // SEC-PAYMENT FIX: Always use Number — fallback String would cause string concatenation
  const workerCount = workerList.length > 0 ? workerList.length : Number(job?.workersNeeded) || 1;
  const totalAmount = (job?.payPerDay || 500) * workerCount;
  // Use farmer's UPI ID from profile, fallback to phone-based UPI
  const upiId = user?.upiId || `${user?.phone || 'farmer'}@upi`;
  // Stable transaction ID per screen session — useMemo prevents re-render regeneration
  const transactionId = useMemo(() => `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`, []);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handleVoiceGuidance = () => {
    const textToSpeak = language === 'te'
      ? 'దయచేసి పనివారికి డబ్బులు చెల్లించండి.'
      : language === 'hi'
        ? 'कृपया मजदूरों को भुगतान करें।'
        : 'Please pay the amount to the workers.';

    Speech.speak(textToSpeak, { language: language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN' });
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      if (paymentMethod === 'cash') {
        // Cash: register + complete in one call
        const response = await paymentService.makePayment({
          jobId: job.id,
          amount: totalAmount,
          method: 'cash',
        });
        if (response.success) {
          navigation.navigate('RateWorker', { job, workers: workerList });
        } else {
          Alert.alert('Error', response.message || 'Payment failed');
        }
      } else {
        // UPI Step 1: Register pending payment in backend
        const response = await paymentService.makePayment({
          jobId: job.id,
          amount: totalAmount,
          method: 'upi',
          transactionId,
        });
        if (!response.success) {
          // Handle already-paid gracefully
          if (response.message?.includes('already')) {
            Alert.alert('Already Paid', 'This job has already been paid. Proceeding to rating.');
            navigation.navigate('RateWorker', { job, workers: workerList });
            return;
          }
          Alert.alert('Error', response.message || 'Could not initiate payment');
          return;
        }
        // UPI Step 2: Open UPI app via deep link
        const upiUrl = `upi://pay?pa=${upiId}&pn=DINASARI&am=${totalAmount}&cu=INR&tn=FarmWork+Payment&tr=${transactionId}`;
        const canOpen = await Linking.canOpenURL(upiUrl);
        if (canOpen) {
          await Linking.openURL(upiUrl);
          setUpiLaunched(true); // Show "confirm" button after UPI app opens
        } else {
          Alert.alert(
            'UPI App Not Found',
            'No UPI app installed. Please pay cash or install Google Pay / PhonePe.',
            [{ text: 'Pay Cash Instead', onPress: () => setPaymentMethod('cash') }, { text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Payment Error:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpiConfirm = async () => {
    setLoading(true);
    try {
      const response = await paymentService.confirmPayment(job.id, transactionId);
      if (response.success) {
        navigation.navigate('RateWorker', { job, workers: workerList });
      } else {
        // Even if backend confirm fails, let farmer continue to rating
        Alert.alert(
          'Payment Noted',
          'Your confirmation has been recorded. Proceeding to rating.',
          [{ text: 'OK', onPress: () => navigation.navigate('RateWorker', { job, workers: workerList }) }]
        );
      }
    } catch (error) {
      console.error('UPI Confirm Error:', error);
      navigation.navigate('RateWorker', { job, workers: workerList });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FDFBF7', '#FFFBF0', '#FFF7E6']} // Rich beige/gold gradient
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Spacer for status bar */}
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#131811" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SECURE PAYMENT</Text>
        <TouchableOpacity onPress={handleVoiceGuidance} style={styles.voiceIcon}>
          <MaterialIcons name="record-voice-over" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Amount Section */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Total to Pay</Text>
          <View style={styles.amountWrap}>
            <Text style={styles.currency}>₹</Text>
            <Text style={styles.amount}>{totalAmount}</Text>
          </View>
          <View style={styles.workerSummary}>
            <MaterialIcons name="groups" size={16} color="#6f8961" />
            <Text style={styles.summaryText}>For {workerCount} Workers</Text>
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.paymentMethodSection}>
          <TouchableOpacity
            style={[
              styles.methodCard,
              paymentMethod === 'cash' && styles.methodCardSelected,
            ]}
            onPress={() => setPaymentMethod('cash')}
            activeOpacity={0.9}
          >
            <View style={[styles.methodIconWrap, paymentMethod === 'cash' && styles.methodIconWrapSelected]}>
              <MaterialIcons
                name="payments"
                size={32}
                color={paymentMethod === 'cash' ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
            <Text
              style={[
                styles.methodText,
                paymentMethod === 'cash' && styles.methodTextSelected,
              ]}
            >
              Cash
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodCard,
              paymentMethod === 'upi' && styles.methodCardSelected,
            ]}
            onPress={() => setPaymentMethod('upi')}
            activeOpacity={0.9}
          >
            <View style={[styles.methodIconWrap, paymentMethod === 'upi' && styles.methodIconWrapSelected]}>
              <MaterialIcons
                name="qr-code-2"
                size={32}
                color={paymentMethod === 'upi' ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
            <Text
              style={[
                styles.methodText,
                paymentMethod === 'upi' && styles.methodTextSelected,
              ]}
            >
              UPI
            </Text>
          </TouchableOpacity>
        </View>

        {/* QR Code Section (Visible if UPI Selected) */}
        {paymentMethod === 'upi' && (
          <View style={styles.qrSection}>
            <View style={styles.qrCard}>
              <Text style={styles.qrLabel}>SCAN TO PAY</Text>
              <View style={styles.qrContainer}>
                <QRCode
                  value={`upi://pay?pa=${upiId}&pn=Farmer&am=${totalAmount}&tn=Payment for work`}
                  size={200}
                  backgroundColor="white"
                />
              </View>
              <Text style={styles.transactionId}>TXID: {transactionId}</Text>
            </View>

            <TouchableOpacity
              style={styles.upiDeeplinkButtonWrap}
              activeOpacity={0.8}
              onPress={async () => {
                const upiUrl = `upi://pay?pa=${upiId}&pn=Farmer&am=${totalAmount}&tn=FarmWork&cu=INR`;
                const canOpen = await Linking.canOpenURL(upiUrl);
                if (canOpen) {
                  Linking.openURL(upiUrl);
                } else {
                  if (Platform.OS === 'android') {
                    Linking.openURL(`intent://pay?pa=${upiId}&pn=Farmer&am=${totalAmount}&tn=FarmWork&cu=INR#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`);
                  } else {
                    Alert.alert('Open UPI App', `UPI ID: ${upiId}\nAmount: ₹${totalAmount}`);
                  }
                }
              }}
            >
              <LinearGradient
                colors={['#131811', '#2D3748']}
                style={styles.upiDeeplinkButton}
              >
                <MaterialIcons name="account-balance-wallet" size={20} color="#FFFFFF" />
                <Text style={styles.upiDeeplinkText}>Open GPay / PhonePe</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.footer}>
        {upiLaunched && paymentMethod === 'upi' ? (
          /* Step 2: After UPI app opened — show "I've Paid" confirm button */
          <TouchableOpacity
            style={styles.paidButtonWrap}
            onPress={handleUpiConfirm}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#15803D', '#16A34A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.paidButton}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={26} color="#FFFFFF" />
                  <Text style={styles.paidButtonText}>I'VE CONFIRMED PAYMENT</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          /* Step 1: Initial payment button */
          <TouchableOpacity
            style={styles.paidButtonWrap}
            onPress={handlePayment}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={colors.primaryGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.paidButton}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.paidButtonText}>
                    {paymentMethod === 'upi' ? 'OPEN UPI & PAY' : 'CONFIRM CASH PAYMENT'}
                  </Text>
                  <MaterialIcons name="check-circle" size={26} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#131811',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 2,
  },
  headerIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  voiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 200,
  },
  amountSection: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6f8961',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currency: {
    fontSize: 32,
    fontWeight: '900',
    color: '#131811',
    opacity: 0.5,
  },
  amount: {
    fontSize: 80,
    fontWeight: '900',
    color: '#131811',
    letterSpacing: -2,
  },
  workerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#6f8961',
    fontWeight: '700',
  },
  paymentMethodSection: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    marginTop: 48,
  },
  methodCard: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}05`,
  },
  methodIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIconWrapSelected: {
    backgroundColor: colors.primary,
  },
  methodText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  methodTextSelected: {
    color: '#131811',
  },
  qrSection: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 20,
  },
  qrLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 4,
    marginBottom: 24,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  transactionId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D1D5DB',
    marginTop: 24,
    textTransform: 'uppercase',
  },
  upiDeeplinkButtonWrap: {
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  upiDeeplinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  upiDeeplinkText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: 'transparent',
  },
  paidButtonWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  paidButton: {
    flexDirection: 'row',
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  paidButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

export default PaymentScreen;
