import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import BottomNavBar from '../../components/BottomNavBar';

const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const SettlementStatusScreen = ({ navigation, route }) => {
  const { user } = useAuthStore();
  const role = user?.role || 'worker';

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const user = useAuthStore.getState().user;
      if (user?.role === 'worker') {
        navigation.navigate('WorkerHome');
      } else if (user?.role === 'leader') {
        navigation.navigate('LeaderHome');
      } else {
        navigation.navigate('FarmerHome');
      }
    }
  };

  const { payment } = route.params || {};

  const isSettled = payment?.settlementStatus?.toLowerCase() === 'settled';
  const grossAmount = payment?.amount || 500;
  const commission = payment?.commissionAmount || (grossAmount * 0.05);
  const netEarnings = payment?.workerAmount || (grossAmount - commission);

  return (
    <LinearGradient
      colors={['#FDFBF7', '#FFFBF0', '#FFF7E6']}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerIcon}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#131811" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTLEMENT STATUS</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isSettled ? (
          /* Settled Success State */
          <View style={styles.card}>
            <View style={[styles.statusIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="check-circle" size={48} color="#10B981" />
            </View>
            <Text style={styles.statusTitle}>Payout Completed</Text>
            <Text style={styles.statusSub}>Your earning has been manually settled by Dinasari admin.</Text>

            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Credited Amount</Text>
              <Text style={styles.amountVal}>{formatINR(netEarnings)}</Text>
            </View>

            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotDone]}>
                  <MaterialIcons name="check" size={12} color="#FFFFFF" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStep}>Farmer Paid Securely</Text>
                  <Text style={styles.timelineDesc}>Dinasari received the booking payment</Text>
                </View>
              </View>

              <View style={[styles.timelineLine, styles.timelineLineDone]} />

              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotDone]}>
                  <MaterialIcons name="check" size={12} color="#FFFFFF" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStep}>Admin Verified</Text>
                  <Text style={styles.timelineDesc}>Completed verification of attendance log</Text>
                </View>
              </View>

              <View style={[styles.timelineLine, styles.timelineLineDone]} />

              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotDone]}>
                  <MaterialIcons name="check" size={12} color="#FFFFFF" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStep}>Transferred to Bank/UPI</Text>
                  <Text style={styles.timelineDesc}>Earning successfully settled manually</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* Pending Settlement State */
          <View style={styles.card}>
            <View style={[styles.statusIconWrap, { backgroundColor: '#FFF9E6' }]}>
              <MaterialIcons name="pending" size={48} color="#F59E0B" />
            </View>
            <Text style={styles.statusTitle}>Payout Pending</Text>
            <Text style={styles.statusSub}>Earning is currently locked in verification phase.</Text>

            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Pending Payout</Text>
              <Text style={[styles.amountVal, { color: '#F59E0B' }]}>{formatINR(netEarnings)}</Text>
            </View>

            <View style={styles.infoBox}>
              <MaterialIcons name="info-outline" size={20} color="#D97706" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Expected Timeline</Text>
                <Text style={styles.infoText}>
                  Manual settlements are processed within 24-48 hours. Our admin team will verify the job completion log before sending UPI/Bank payouts.
                </Text>
              </View>
            </View>

            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotDone]}>
                  <MaterialIcons name="check" size={12} color="#FFFFFF" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStep}>Farmer Paid Securely</Text>
                  <Text style={styles.timelineDesc}>Dinasari received the booking payment</Text>
                </View>
              </View>

              <View style={[styles.timelineLine, styles.timelineLineDone]} />

              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotActive]}>
                  <View style={styles.activeDotInner} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineStep, { color: '#F59E0B' }]}>Admin Verification</Text>
                  <Text style={styles.timelineDesc}>Awaiting admin validation (24-48h limit)</Text>
                </View>
              </View>

              <View style={styles.timelineLine} />

              <View style={styles.timelineItem}>
                <View style={styles.timelineDot}>
                  <View style={styles.dotInner} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStep}>Transfer to Bank/UPI</Text>
                  <Text style={styles.timelineDesc}>Payout will be manually transferred</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Text style={styles.backBtnText}>Back to Wallet</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNavBar role={role} activeTab="Profile" />
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
  scroll: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
  },
  statusIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  statusSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  amountBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginVertical: 20,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  amountVal: {
    fontSize: 28,
    fontWeight: '900',
    color: '#10B981',
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 24,
    width: '100%',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
    fontWeight: '600',
  },
  timeline: {
    width: '100%',
    paddingLeft: 12,
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineDotDone: {
    backgroundColor: '#10B981',
  },
  timelineDotActive: {
    backgroundColor: '#FEF3C7',
  },
  activeDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  timelineContent: {
    flex: 1,
  },
  timelineStep: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  timelineDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 14,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginLeft: 11,
    marginVertical: 4,
    zIndex: 1,
  },
  timelineLineDone: {
    backgroundColor: '#10B981',
  },
  backBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default SettlementStatusScreen;
