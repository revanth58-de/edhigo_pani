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

const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const WorkerPaymentDetailsScreen = ({ navigation, route }) => {
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

  const grossAmount = payment?.amount || 0;
  const commission = payment?.commissionAmount || (grossAmount * 0.05);
  const netEarnings = payment?.workerAmount || (grossAmount - commission);
  const isSettled = payment?.settlementStatus?.toLowerCase() === 'settled';

  const dateStr = payment?.paidAt || payment?.createdAt;
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const formattedTime = dateStr
    ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

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
        <Text style={styles.headerTitle}>TRANSACTION RECEIPT</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Receipt card */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <MaterialIcons name="receipt-long" size={32} color={colors.primary} />
            <Text style={styles.receiptEarning}>Your Earnings share</Text>
            <Text style={styles.receiptAmount}>{formatINR(netEarnings)}</Text>
            <View style={[styles.statusBadge, isSettled ? styles.statusBadgeSettled : styles.statusBadgePending]}>
              <Text style={[styles.statusBadgeText, isSettled ? styles.statusBadgeTextSettled : styles.statusBadgeTextPending]}>
                {isSettled ? 'Settled' : 'Pending Settlement'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Breakup details</Text>

          <View style={styles.breakupRow}>
            <Text style={styles.breakupLabel}>Farmer Gross Payment</Text>
            <Text style={styles.breakupVal}>{formatINR(grossAmount)}</Text>
          </View>

          <View style={styles.breakupRow}>
            <Text style={styles.breakupLabel}>Dinasari Commission (5%)</Text>
            <Text style={[styles.breakupVal, { color: '#EF4444' }]}>- {formatINR(commission)}</Text>
          </View>

          <View style={styles.breakupRow}>
            <Text style={styles.breakupLabel}>Your Earnings share (95%)</Text>
            <Text style={[styles.breakupVal, { color: '#10B981', fontWeight: '900' }]}>{formatINR(netEarnings)}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Transaction Info</Text>

          <View style={styles.breakupRow}>
            <Text style={styles.breakupLabel}>Farmer Name</Text>
            <Text style={styles.breakupVal}>{payment?.farmerName || 'Farmer'}</Text>
          </View>

          <View style={styles.breakupRow}>
            <Text style={styles.breakupLabel}>Work category</Text>
            <Text style={styles.breakupVal}>{payment?.workType?.toUpperCase() || 'AGRICULTURE WORK'}</Text>
          </View>

          <View style={styles.breakupRow}>
            <Text style={styles.breakupLabel}>Farm Location</Text>
            <Text style={styles.breakupVal} numberOfLines={1}>{payment?.farmAddress || 'Rural Farm'}</Text>
          </View>

          <View style={styles.breakupRow}>
            <Text style={styles.breakupLabel}>Payment Mode</Text>
            <Text style={styles.breakupVal}>{payment?.method?.toUpperCase() || 'UPI'}</Text>
          </View>

          <View style={styles.breakupRow}>
            <Text style={styles.breakupLabel}>Transaction Reference</Text>
            <Text style={styles.breakupValCode}>{payment?.id?.toUpperCase() || 'TRX-DEFAULT'}</Text>
          </View>

          <View style={styles.breakupRow}>
            <Text style={styles.breakupLabel}>Transaction Date</Text>
            <Text style={styles.breakupVal}>{formattedDate} • {formattedTime}</Text>
          </View>
        </View>

        {/* Dynamic Timeline action button */}
        {!isSettled && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('SettlementStatus', { payment })}
            activeOpacity={0.8}
          >
            <MaterialIcons name="timeline" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Check Payout Timeline</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.disputeBtn, { marginTop: 12 }]}
          onPress={() => navigation.navigate('Dispute', { jobId: payment?.jobId, paymentId: payment?.id })}
          activeOpacity={0.8}
        >
          <MaterialIcons name="report-problem" size={20} color="#EF4444" />
          <Text style={styles.disputeBtnText}>Report Issue / Dispute Payment</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 40,
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
  },
  receiptHeader: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  receiptEarning: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginTop: 12,
  },
  receiptAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#111827',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 16,
  },
  statusBadgePending: {
    backgroundColor: '#FFF9E6',
  },
  statusBadgeSettled: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusBadgeTextPending: {
    color: '#D97706',
  },
  statusBadgeTextSettled: {
    color: '#059669',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  breakupLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  breakupVal: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '700',
  },
  breakupValCode: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '800',
  },
  actionBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disputeBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disputeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E11D48',
  },
});

export default WorkerPaymentDetailsScreen;
