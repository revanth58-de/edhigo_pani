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

const PaymentScreen = ({ navigation, route }) => {
  const { job, workers } = route.params;
  const { t } = useTranslation();
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'cash' or 'upi'
  const [loading, setLoading] = useState(false);

  const { user, language } = useAuthStore();
  const workerCount = workers?.length || String(job?.workersNeeded || 1);
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
      const response = await paymentService.makePayment({
        jobId: job.id,
        amount: totalAmount,
        method: paymentMethod,
      });

      if (response.success) {
        navigation.navigate('RateWorker', { job, workers });
      } else {
        Alert.alert('Error', response.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment Error:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <MaterialIcons name="arrow-back" size={28} color="#131811" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment.title') || 'Payment'}</Text>
        <TouchableOpacity onPress={handleVoiceGuidance} style={styles.voiceIcon}>
          <MaterialIcons name="record-voice-over" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Voice Guidance Banner */}
        <TouchableOpacity
          style={styles.voiceBanner}
          onPress={handleVoiceGuidance}
          activeOpacity={0.8}
        >
          <View style={styles.voiceIconContainer}>
            <MaterialIcons name="volume-up" size={24} color={colors.primary} />
          </View>
          <Text style={styles.voiceBannerText}>
            "Dabbulu pay cheyyandi" (Please pay the amount)
          </Text>
        </TouchableOpacity>

        {/* Amount Display */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Total Amount to Pay</Text>
          <Text style={styles.amount}>₹{totalAmount}</Text>
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
            <MaterialIcons
              name="payments"
              size={48}
              color={paymentMethod === 'cash' ? colors.primary : '#9CA3AF'}
            />
            <Text
              style={[
                styles.methodText,
                paymentMethod === 'cash' && styles.methodTextSelected,
              ]}
            >
              CASH
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
            <MaterialIcons
              name="qr-code-2"
              size={48}
              color={paymentMethod === 'upi' ? colors.primary : '#9CA3AF'}
            />
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
            <Text style={styles.qrLabel}>SCAN THIS CODE</Text>
            <View style={styles.qrCard}>
              <QRCode
                value={`upi://pay?pa=${upiId}&pn=Farmer&am=${totalAmount}&tn=Payment for work`}
                size={256}
              />
            </View>
            <Text style={styles.transactionId}>Transaction ID: {transactionId}</Text>

            {/* UPI Deeplink button — opens GPay/PhonePe/any UPI app directly */}
            <TouchableOpacity
              style={styles.upiDeeplinkButton}
              onPress={async () => {
                const upiUrl = `upi://pay?pa=${upiId}&pn=Farmer&am=${totalAmount}&tn=FarmWork&cu=INR`;
                const canOpen = await Linking.canOpenURL(upiUrl);
                if (canOpen) {
                  Linking.openURL(upiUrl);
                } else {
                  // Fallback: try intent URL for Android, or show instructions
                  if (Platform.OS === 'android') {
                    Linking.openURL(`intent://pay?pa=${upiId}&pn=Farmer&am=${totalAmount}&tn=FarmWork&cu=INR#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`);
                  } else {
                    Alert.alert(
                      'Open UPI App',
                      'Please open GPay, PhonePe or any UPI app and pay to:\n\n' +
                      `UPI ID: ${upiId}\nAmount: ₹${totalAmount}`,
                      [{ text: 'OK' }]
                    );
                  }
                }
              }}
            >
              <Text style={styles.upiDeeplinkText}>💳 Open UPI App to Pay</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.paidButton}
          onPress={handlePayment}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color={colors.backgroundDark} />
          ) : (
            <>
              <Text style={styles.paidButtonText}>PAID</Text>
              <MaterialIcons name="check-circle" size={32} color={colors.backgroundDark} />
            </>
          )}
        </TouchableOpacity>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem}>
            <MaterialIcons name="home" size={30} color={colors.primary} />
            <Text style={[styles.tabText, styles.tabTextActive]}>HOME</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <MaterialIcons name="history" size={30} color="#9CA3AF" />
            <Text style={styles.tabText}>HISTORY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <MaterialIcons name="account-circle" size={30} color="#9CA3AF" />
            <Text style={styles.tabText}>PROFILE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
    flex: 1,
    textAlign: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  voiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}33`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}1A`,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  voiceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#131811',
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 200,
  },
  amountSection: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  amountLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6f8961',
    marginBottom: 4,
  },
  amount: {
    fontSize: 64,
    fontWeight: '900',
    color: '#131811',
    paddingVertical: 16,
  },
  paymentMethodSection: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginTop: 32,
  },
  methodCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}0D`,
  },
  methodText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6f8961',
    marginTop: 8,
  },
  methodTextSelected: {
    color: '#131811',
  },
  qrSection: {
    marginTop: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  qrLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6f8961',
    letterSpacing: 2,
    marginBottom: 16,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  transactionId: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 16,
  },
  upiDeeplinkButton: {
    marginTop: 16,
    backgroundColor: '#131811',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 9999,
    alignItems: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  paidButton: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  paidButtonText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.backgroundDark,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 24,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginTop: 4,
  },
  tabTextActive: {
    color: colors.primary,
  },
});

export default PaymentScreen;
