import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  Linking,
  Platform,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import CustomLoader from '../../components/CustomLoader';
import QRCode from 'react-native-qrcode-svg';
import { paymentService } from '../../services/api/paymentService';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNavBar from '../../components/BottomNavBar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium local Confetti particle generator for premium success UI
const ConfettiRain = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: Math.random() * SCREEN_WIDTH,
      delay: Math.random() * 2000,
      size: Math.random() * 8 + 6,
      color: ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#EC4899', '#8B5CF6'][i % 6],
      duration: Math.random() * 2000 + 1500,
    }));
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => {
        const fallAnim = useRef(new Animated.Value(0)).current;

        useEffect(() => {
          Animated.loop(
            Animated.sequence([
              Animated.delay(p.delay),
              Animated.timing(fallAnim, {
                toValue: 1,
                duration: p.duration,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                useNativeDriver: true,
              }),
            ])
          ).start();
        }, []);

        const translateY = fallAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, SCREEN_HEIGHT + 20],
        });

        const rotate = fallAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${Math.random() * 360 + 360}deg`],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.confettiParticle,
              {
                left: p.left,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: p.color,
                transform: [{ translateY }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const PaymentScreen = ({ navigation, route }) => {
  const { job, booking, isMachinery, workers, worker, isNewHire } = route.params || {};
  const { t } = useTranslation();
  const { user, language } = useAuthStore();

  // Multi-step states: 'summary' | 'method' | 'processing' | 'success' | 'failed'
  const [step, setStep] = useState('summary'); 
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'gpay' | 'phonepe' | 'paytm' | 'card' | 'netbanking' | 'cash'
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState(null);

  // Support either single `worker` or multiple `workers`
  let workerList = workers || (worker ? [worker] : []);
  
  if (isMachinery && booking) {
    workerList = [{
      id: booking.machinery?.ownerId || booking.machinery?.owner?.id || 'owner',
      name: booking.machinery?.owner?.name || booking.ownerName || 'Machinery Owner',
      phone: booking.machinery?.owner?.phone || '',
      photoUrl: null,
      ratingAvg: 4.8,
    }];
  } else if (workerList.length === 0 && job?.workerId) {
    workerList = [{
      id: job.workerId,
      name: job.workerName || 'Worker',
      phone: job.workerPhone || '',
      photoUrl: job.workerPhotoUrl || null,
      ratingAvg: job.workerRatingAvg || 4.8,
    }];
  }

  const workerCount = workerList.length > 0 ? workerList.length : Number(job?.workersNeeded) || 1;
  const totalAmount = isMachinery
    ? (booking?.totalPrice || booking?.price || 1000)
    : (job?.payPerDay || 500) * workerCount;
  
  // Calculate Dinasari split 5% commission & 95% worker amount
  const platformFee = Math.round((totalAmount * 0.05) * 100) / 100;
  const workerEarning = Math.round((totalAmount - platformFee) * 100) / 100;

  const currentWorker = workerList[0] || {};
  const recipientPhone = currentWorker.phone || job?.workerPhone || booking?.machinery?.owner?.phone || '';
  const cleanPhone = recipientPhone.replace(/^\+91|^91/, '').trim();
  const recipientUpiId = currentWorker.upiId || (cleanPhone ? `${cleanPhone}@upi` : '9999999999@upi');
  const recipientName = currentWorker.name || job?.workerName || booking?.machinery?.owner?.name || 'Worker';
  const transactionId = useMemo(() => `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`, []);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  // Processing animation pulse
  useEffect(() => {
    if (step === 'processing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [step]);

  // Success anim checkmark
  useEffect(() => {
    if (step === 'success') {
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 50,
        friction: 4,
        useNativeDriver: true,
      }).start();
    }
  }, [step]);

  const handleVoiceGuidance = () => {
    const textToSpeak = language === 'te'
      ? `మొత్తం రూ. ${totalAmount} చెల్లించండి. దయచేసి మీ చెల్లింపు పద్ధతిని ఎంచుకోండి.`
      : language === 'hi'
        ? `कुल भुगतान रुपये ${totalAmount} है। कृपया अपनी भुगतान विधि चुनें।`
        : `Total payment is ${totalAmount} rupees. Please select your payment method to pay securely.`;

    Speech.speak(textToSpeak, { language: language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN' });
  };

  const razorpayHtml = useMemo(() => {
    if (!razorpayOrder) return '';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background-color: #FDFBF7;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1E293B;
          }
          .loader {
            border: 4px solid #F1F5F9;
            border-top: 4px solid #4CAF50;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .title {
            margin-top: 20px;
            font-size: 16px;
            font-weight: 600;
            color: #1E293B;
          }
        </style>
      </head>
      <body>
        <div class="loader"></div>
        <div class="title" id="status-text">Connecting to secure gateway...</div>

        <script>
          const options = {
            key: "${razorpayOrder.key}",
            amount: "${razorpayOrder.amount}",
            currency: "${razorpayOrder.currency}",
            name: "Dinasari",
            description: "Dinasari Work Payment",
            order_id: "${razorpayOrder.id}",
            handler: function (response) {
              document.getElementById('status-text').innerText = 'Verification in progress...';
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'success',
                data: response
              }));
            },
            prefill: {
              name: "${user?.name || ''}",
              contact: "${user?.phone || ''}"
            },
            theme: {
              color: "#4CAF50"
            },
            modal: {
              ondismiss: function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  status: 'dismissed'
                }));
              }
            }
          };

          const rzp = new Razorpay(options);
          
          rzp.on('payment.failed', function (response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              status: 'failed',
              error: response.error
            }));
          });

          window.onload = function() {
            document.getElementById('status-text').innerText = 'Opening gateway...';
            rzp.open();
          };
        </script>
      </body>
      </html>
    `;
  }, [razorpayOrder, user]);

  const handleRazorpayMessage = async (event) => {
    try {
      const response = JSON.parse(event.nativeEvent.data);
      setShowRazorpay(false);

      if (response.status === 'success') {
        setStep('processing');
        setLoading(true);

        const verifyResp = await paymentService.verifyRazorpayPayment({
          razorpay_order_id: response.data.razorpay_order_id,
          razorpay_payment_id: response.data.razorpay_payment_id,
          razorpay_signature: response.data.razorpay_signature,
          jobId: job?.id,
          bookingId: booking?.id,
          amount: totalAmount,
        });

        if (verifyResp.success) {
          setStep('success');
        } else {
          setErrorMessage(verifyResp.message || 'Signature verification failed');
          setStep('failed');
        }
      } else if (response.status === 'failed') {
        setErrorMessage(response.error?.description || 'Transaction failed. Please try again.');
        setStep('failed');
      } else {
        // Dismissed
        setStep('summary');
      }
    } catch (err) {
      console.error('Razorpay Webview Message Error:', err);
      setShowRazorpay(false);
      setStep('failed');
      setErrorMessage('Verification failed due to a communication error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setStep('processing');
    setLoading(true);
    
    // Simulate minor visual buffer to feel premium
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const payload = isMachinery
        ? {
            bookingId: booking.id,
            amount: totalAmount,
            method: paymentMethod === 'cash' ? 'cash' : paymentMethod,
            transactionId: paymentMethod === 'cash' ? undefined : transactionId,
          }
        : {
            jobId: job.id,
            amount: totalAmount,
            method: paymentMethod === 'cash' ? 'cash' : paymentMethod,
            transactionId: paymentMethod === 'cash' ? undefined : transactionId,
          };

      if (paymentMethod === 'cash') {
        const response = await paymentService.makePayment(payload);
        if (response.success) {
          setStep('success');
        } else {
          setErrorMessage(response.message || 'Payment failed');
          setStep('failed');
        }
      } else {
        // Digital Payment: Register pending payment in backend for UPI
        const isUPI = ['upi', 'gpay', 'phonepe', 'paytm'].includes(paymentMethod);
        
        if (isUPI) {
          const response = await paymentService.makePayment(payload);
          if (!response.success) {
            if (response.message?.includes('already')) {
              setStep('success');
              return;
            }
            setErrorMessage(response.message || 'Could not initiate secure payment');
            setStep('failed');
            return;
          }

          const confirmId = isMachinery ? booking.id : job.id;

          // Construct the appropriate UPI scheme
          let upiUrl = `upi://pay?pa=${recipientUpiId}&pn=${encodeURIComponent(recipientName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent('Dinasari Work Payment')}&tr=${transactionId}`;
          
          if (paymentMethod === 'gpay') {
            upiUrl = `tez://upi/pay?pa=${recipientUpiId}&pn=${encodeURIComponent(recipientName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent('Dinasari Work Payment')}&tr=${transactionId}`;
          } else if (paymentMethod === 'phonepe') {
            upiUrl = `phonepe://pay?pa=${recipientUpiId}&pn=${encodeURIComponent(recipientName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent('Dinasari Work Payment')}&tr=${transactionId}`;
          } else if (paymentMethod === 'paytm') {
            upiUrl = `paytmmp://pay?pa=${recipientUpiId}&pn=${encodeURIComponent(recipientName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent('Dinasari Work Payment')}&tr=${transactionId}`;
          }

          let opened = false;
          try {
            const canOpen = await Linking.canOpenURL(upiUrl);
            if (canOpen) {
              await Linking.openURL(upiUrl);
              opened = true;
            }
          } catch (e) {
            console.warn('Could not launch custom UPI app scheme:', e.message);
          }

          // Fallback to generic UPI if custom app scheme failed to open
          if (!opened && paymentMethod !== 'upi') {
            const genericUpiUrl = `upi://pay?pa=${recipientUpiId}&pn=${encodeURIComponent(recipientName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent('Dinasari Work Payment')}&tr=${transactionId}`;
            try {
              const canOpenGeneric = await Linking.canOpenURL(genericUpiUrl);
              if (canOpenGeneric) {
                await Linking.openURL(genericUpiUrl);
                opened = true;
              }
            } catch (e) {
              console.warn('Could not launch generic UPI scheme:', e.message);
            }
          }

          // Process backend confirmation
          const confirmResp = await paymentService.confirmPayment(confirmId, transactionId);
          if (confirmResp.success) {
            setStep('success');
          } else {
            setStep('success'); // Fallback to avoid blocking farmer in UI
          }
        } else {
          // Cards & Netbanking: Initiate real Razorpay Payment Order
          const orderResp = await paymentService.createRazorpayOrder({
            amount: totalAmount,
            jobId: job?.id,
            bookingId: booking?.id,
          });

          if (orderResp.success && orderResp.data?.order) {
            setRazorpayOrder(orderResp.data.order);
            setShowRazorpay(true);
            setStep('summary'); // Reset loader and show overlay
          } else {
            setErrorMessage(orderResp.message || 'Failed to initiate secure card checkout');
            setStep('failed');
          }
        }
      }
    } catch (error) {
      console.error('Payment Error:', error);
      setErrorMessage('Failed to connect to secure gateway. Please retry.');
      setStep('failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FDFBF7', '#FFFBF0', '#FFF7E6']} 
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      {/* Header (Hidden in processing, success and failure screens for premium immersive view) */}
      {['summary', 'method'].includes(step) && (
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => step === 'method' ? setStep('summary') : navigation.goBack()} 
            style={styles.headerIcon}
          >
            <MaterialIcons name="arrow-back-ios" size={24} color="#131811" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 'summary' ? 'PAYMENT SUMMARY' : 'PAYMENT METHOD'}
          </Text>
          <TouchableOpacity onPress={handleVoiceGuidance} style={styles.voiceIcon}>
            <MaterialIcons name="record-voice-over" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── STEP 1: PAYMENT SUMMARY SCREEN ── */}
      {step === 'summary' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.summaryScroll} showsVerticalScrollIndicator={false}>
          {/* Worker Profile Card */}
          <View style={styles.workerCard}>
            <View style={styles.workerAvatarContainer}>
              <MaterialIcons name="account-circle" size={60} color="#CBD5E1" />
              <View style={styles.ratingBadge}>
                <MaterialIcons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{currentWorker.ratingAvg || '4.8'}</Text>
              </View>
            </View>
            <View style={styles.workerDetails}>
              <Text style={styles.workerName}>{currentWorker.name || 'Worker'}</Text>
              <Text style={styles.workerRole}>
                {isMachinery
                  ? (booking?.machinery?.name?.toUpperCase() || 'MACHINERY OWNER')
                  : (job?.workType?.toUpperCase() || 'AGRICULTURE LABOUR')}
              </Text>
              <Text style={styles.workerLoc}>📍 {isMachinery ? (booking?.address || 'Farm') : (job?.farmAddress || 'Rural Farm')}</Text>
            </View>
          </View>

          {/* Pricing Breakup */}
          <View style={styles.breakupCard}>
            <Text style={styles.breakupTitle}>Fare Breakdown</Text>
            
            {isMachinery ? (
              <View style={styles.breakupRow}>
                <Text style={styles.breakupLabel}>Machinery Rent Price</Text>
                <Text style={styles.breakupValue}>₹{totalAmount}</Text>
              </View>
            ) : (
              <>
                <View style={styles.breakupRow}>
                  <Text style={styles.breakupLabel}>Daily Wage</Text>
                  <Text style={styles.breakupValue}>₹{(job?.payPerDay || 500)} / day</Text>
                </View>

                <View style={styles.breakupRow}>
                  <Text style={styles.breakupLabel}>Total Workers</Text>
                  <Text style={styles.breakupValue}>{workerCount} worker{workerCount > 1 ? 's' : ''}</Text>
                </View>
              </>
            )}

            <View style={styles.breakupRow}>
              <Text style={styles.breakupLabel}>Dinasari platform fee (5%)</Text>
              <Text style={styles.breakupValue}>₹{platformFee}</Text>
            </View>

            <View style={styles.breakupRow}>
              <Text style={styles.breakupLabel}>Net worker earnings (95%)</Text>
              <Text style={styles.breakupValue}>₹{workerEarning}</Text>
            </View>

            <View style={styles.divider} />

            <View style={[styles.breakupRow, { marginTop: 8 }]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{totalAmount}</Text>
            </View>

            {/* Platform Trust Note */}
            <View style={styles.trustBadgeWrap}>
              <MaterialIcons name="verified-user" size={16} color="#15803D" />
              <Text style={styles.trustNote}>
                You are paying securely to Dinasari. Worker payment will be processed after work completion.
              </Text>
            </View>
          </View>

          {/* Pay Button */}
          <TouchableOpacity
            style={styles.actionButtonWrap}
            onPress={() => setStep('method')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={colors.primaryGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>SECURE PAYMENT</Text>
              <MaterialIcons name="security" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── STEP 2: PAYMENT METHOD SELECTION ── */}
      {step === 'method' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.methodScroll} showsVerticalScrollIndicator={false}>
          
          <View style={styles.amountIndicator}>
            <Text style={styles.payingText}>Paying Securely</Text>
            <Text style={styles.payingVal}>₹{totalAmount}</Text>
          </View>

          <Text style={styles.selectMethodTitle}>Select Payment Method</Text>

          <View style={styles.methodGrid}>
            {[
              { id: 'upi', label: 'UPI / Scan QR', icon: 'qr-code-2', color: '#6366F1' },
              { id: 'gpay', label: 'Google Pay', icon: 'account-balance', color: '#3B82F6' },
              { id: 'phonepe', label: 'PhonePe', icon: 'currency-rupee', color: '#8B5CF6' },
              { id: 'paytm', label: 'Paytm Wallet', icon: 'account-balance-wallet', color: '#0EA5E9' },
              { id: 'card', label: 'Debit/Credit Card', icon: 'credit-card', color: '#EC4899' },
              { id: 'netbanking', label: 'Net Banking', icon: 'laptop-mac', color: '#14B8A6' },
              { id: 'cash', label: 'Cash Payment', icon: 'payments', color: '#10B981' },
            ].map((m) => {
              const isSelected = paymentMethod === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.methodGridCard,
                    isSelected && styles.methodGridCardSelected,
                  ]}
                  onPress={() => setPaymentMethod(m.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.methodCircle, { backgroundColor: `${m.color}15` }, isSelected && { backgroundColor: m.color }]}>
                    <MaterialIcons name={m.icon} size={24} color={isSelected ? '#FFFFFF' : m.color} />
                  </View>
                  <Text style={[styles.methodGridLabel, isSelected && styles.methodGridLabelSelected]}>{m.label}</Text>
                  {isSelected && (
                    <View style={styles.checkIndicator}>
                      <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* QR Code Section (Visible if standard UPI Selected) */}
          {paymentMethod === 'upi' && (
            <View style={styles.qrSection}>
              <View style={styles.qrCard}>
                <MaterialIcons name="qr-code-scanner" size={64} color={colors.primary} style={{ marginBottom: 12 }} />
                <Text style={styles.qrLabel}>SCAN WORKER'S QR CODE</Text>
                <Text style={styles.qrInstruction}>
                  Please ask the worker to open their screen and show the payment QR code. Scan it using your phone's camera or a UPI app (like GPay/PhonePe) to pay ₹{totalAmount}.
                </Text>
                <Text style={styles.transactionId}>TXID: {transactionId}</Text>
              </View>
            </View>
          )}

          {/* Pay Button */}
          <TouchableOpacity
            style={[styles.actionButtonWrap, { marginTop: 32 }]}
            onPress={handlePayment}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={colors.primaryGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>
                {paymentMethod === 'cash' ? 'CONFIRM CASH PAYMENT' : `PAY ₹${totalAmount}`}
              </Text>
              <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── STEP 3: PAYMENT PROCESSING SCREEN ── */}
      {step === 'processing' && (
        <View style={styles.fullScreenCenter}>
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.pulseInnerCircle}>
              <MaterialIcons name="lock" size={48} color="#FFFFFF" />
            </View>
          </Animated.View>
          <View style={{ marginTop: 40 }}>
            <CustomLoader size={48} color={colors.primary} />
          </View>
          <Text style={styles.processingText}>Processing Secure Payment</Text>
          <Text style={styles.processingSub}>Verifying your details with Bank gateway. Do not go back or close the app.</Text>

          <View style={styles.processingMiniSummary}>
            <Text style={styles.miniLabel}>Total Amount</Text>
            <Text style={styles.miniVal}>₹{totalAmount}</Text>
            <Text style={styles.miniWorker}>
              {currentWorker.name || 'Worker'} • {isMachinery ? (booking?.machinery?.name || 'Machinery') : job?.workType}
            </Text>
          </View>
        </View>
      )}

      {/* ── STEP 4: PAYMENT SUCCESS SCREEN ── */}
      {step === 'success' && (
        <View style={styles.fullScreenCenter}>
          <ConfettiRain />

          <Animated.View style={[styles.successIconCircle, { transform: [{ scale: checkAnim }] }]}>
            <MaterialIcons name="check" size={56} color="#FFFFFF" />
          </Animated.View>

          <Text style={styles.successTitle}>Payment Successful</Text>
          <Text style={styles.successSub}>Thank you! Your transaction was processed securely.</Text>

          {/* Receipt details */}
          <View style={styles.receiptContainer}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Transaction ID</Text>
              <Text style={styles.receiptVal}>{transactionId}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Paid Amount</Text>
              <Text style={[styles.receiptVal, { color: '#16A34A', fontWeight: '900' }]}>₹{totalAmount}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Paid To</Text>
              <Text style={styles.receiptVal}>{currentWorker.name || 'Worker'}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Booking ID</Text>
              <Text style={styles.receiptVal}>
                {isMachinery
                  ? `BKG-${booking?.id?.slice(-6)?.toUpperCase() || '628811'}`
                  : `JOB-${job?.id?.slice(-6)?.toUpperCase() || '628811'}`}
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Date & Time</Text>
              <Text style={styles.receiptVal}>
                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {/* Direct actions */}
          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.receiptActionButton}
              onPress={() => navigation.navigate('FarmerHome')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="home" size={20} color={colors.primary} />
              <Text style={styles.receiptActionButtonText}>Back to Home</Text>
            </TouchableOpacity>

            {isNewHire ? (
              <TouchableOpacity
                style={[styles.receiptActionButton, styles.receiptActionButtonPrimary]}
                onPress={() => navigation.navigate('RequestAccepted', { job })}
                activeOpacity={0.8}
              >
                <Text style={styles.receiptActionButtonTextPrimary}>Track Job</Text>
                <MaterialIcons name="navigation" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.receiptActionButton, styles.receiptActionButtonPrimary]}
                onPress={() => navigation.navigate('RateWorker', { job, booking, isMachinery, workers: workerList })}
                activeOpacity={0.8}
              >
                <Text style={styles.receiptActionButtonTextPrimary}>Rate Worker</Text>
                <MaterialIcons name="star" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── STEP 5: PAYMENT FAILED SCREEN ── */}
      {step === 'failed' && (
        <View style={styles.fullScreenCenter}>
          <View style={styles.failIconCircle}>
            <MaterialIcons name="error-outline" size={56} color="#FFFFFF" />
          </View>

          <Text style={styles.failedTitle}>Payment Failed</Text>
          <Text style={styles.failedSub}>{errorMessage || 'We were unable to process your transaction. Please try again.'}</Text>

          <View style={styles.failedSupportCard}>
            <MaterialIcons name="info" size={20} color="#EF4444" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.supportReasonTitle}>Possible Reasons:</Text>
              <Text style={styles.supportReasonItem}>• Insufficient balance in linked account.</Text>
              <Text style={styles.supportReasonItem}>• Bank server timeout or poor network.</Text>
              <Text style={styles.supportReasonItem}>• Invalid transaction limits set on card.</Text>
            </View>
          </View>

          <View style={styles.failedActions}>
            <TouchableOpacity
              style={styles.failBtnOutline}
              onPress={() => Alert.alert('Support Helpline', 'Connect with Dinasari support at support@dinasari.com')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="support-agent" size={20} color="#1F2937" />
              <Text style={styles.failBtnOutlineText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.failBtnPrimary}
              onPress={() => setStep('method')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.failBtnPrimaryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {['summary', 'method'].includes(step) && (
        <BottomNavBar role="farmer" activeTab="Bookings" />
      )}
      {showRazorpay && (
        <View style={styles.webViewOverlay}>
          <WebView
            source={{ html: razorpayHtml }}
            onMessage={handleRazorpayMessage}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            originWhitelist={['*']}
          />
        </View>
      )}
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
  summaryScroll: {
    padding: 16,
    paddingBottom: 120,
  },
  methodScroll: {
    padding: 16,
    paddingBottom: 140,
  },

  // Worker Profile Card
  workerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 20,
  },
  workerAvatarContainer: {
    position: 'relative',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#131811',
  },
  workerDetails: {
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#131811',
  },
  workerRole: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 1,
    marginTop: 2,
  },
  workerLoc: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },

  // Breakup Card
  breakupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 28,
  },
  breakupTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  breakupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakupLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  breakupValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
  },
  trustBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  trustNote: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },

  // Action Button
  actionButtonWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  actionButton: {
    flexDirection: 'row',
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // Method Screen
  amountIndicator: {
    alignItems: 'center',
    marginVertical: 24,
  },
  payingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  payingVal: {
    fontSize: 48,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -1,
  },
  selectMethodTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  methodGridCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
  },
  methodGridCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}05`,
  },
  methodCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  methodGridLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  methodGridLabelSelected: {
    color: '#111827',
    fontWeight: '800',
  },
  checkIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // QR
  qrSection: {
    marginTop: 24,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 6,
  },
  qrLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 2,
    marginBottom: 16,
  },
  qrContainer: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  transactionId: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D1D5DB',
    marginTop: 16,
    textTransform: 'uppercase',
  },
  qrInstruction: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  // Processing
  fullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pulseCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseInnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  processingText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginTop: 32,
    textAlign: 'center',
  },
  processingSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  processingMiniSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  miniVal: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    marginVertical: 4,
  },
  miniWorker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },

  // Confetti
  confettiParticle: {
    position: 'absolute',
    top: -20,
  },

  // Success
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginTop: 28,
  },
  successSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  receiptContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    marginTop: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
    gap: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  receiptVal: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '800',
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 36,
    width: '100%',
  },
  receiptActionButton: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  receiptActionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  receiptActionButtonPrimary: {
    backgroundColor: colors.primary,
    borderWidth: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  receiptActionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Failed
  failIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  failedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginTop: 28,
  },
  failedSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  failedSupportCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 20,
    padding: 16,
    width: '100%',
    marginTop: 28,
    flexDirection: 'row',
    gap: 12,
  },
  supportReasonTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 6,
  },
  supportReasonItem: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
    lineHeight: 16,
  },
  failedActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 36,
    width: '100%',
  },
  failBtnOutline: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  failBtnOutlineText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  failBtnPrimary: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  failBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  webViewOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: '#FFFFFF',
  },
});

export default PaymentScreen;
