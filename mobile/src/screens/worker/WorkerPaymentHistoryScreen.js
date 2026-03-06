// Worker Payment History Screen — shows all payments received by the worker
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { paymentService } from '../../services/api/paymentService';
import { colors } from '../../theme/colors';
import useAuthStore from '../../store/authStore';

const METHOD_ICONS = {
  upi: 'qr-code-2',
  cash: 'payments',
  bank: 'account-balance',
};

const STATUS_META = {
  completed: { label: 'Received', color: '#10B981', bg: '#D1FAE5', icon: 'check-circle' },
  pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7', icon: 'schedule' },
  failed: { label: 'Failed', color: '#EF4444', bg: '#FEE2E2', icon: 'cancel' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const PaymentCard = ({ payment }) => {
  const status = STATUS_META[payment.status] || STATUS_META.pending;
  const method = payment.method || 'cash';

  return (
    <View style={styles.card}>
      {/* Top row: icon + job type + amount */}
      <View style={styles.cardTop}>
        <View style={styles.iconCircle}>
          <MaterialIcons name={METHOD_ICONS[method] || 'payments'} size={28} color={colors.primary} />
        </View>
        <View style={styles.cardMain}>
          <Text style={styles.jobType}>{payment.job?.workType || 'Farm Work'}</Text>
          <Text style={styles.farmerName}>From: {payment.farmer?.name || 'Farmer'}</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amount}>₹{payment.amount}</Text>
          <Text style={styles.methodLabel}>{method.toUpperCase()}</Text>
        </View>
      </View>

      {/* Bottom row: status + date */}
      <View style={styles.cardBottom}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <MaterialIcons name={status.icon} size={13} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(payment.createdAt)}</Text>
      </View>
    </View>
  );
};

const WorkerPaymentHistoryScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    const loadPayments = async () => {
      setLoading(true);
      try {
        const result = await paymentService.getPaymentHistory(user?.id);
        // paymentService wraps axios: result = { success, data: { payments: [], count } }
        // On error it returns: { success: false, data: [] }
        const payload = result?.data;
        const raw = Array.isArray(payload)
          ? payload                   // fallback: data is already an array
          : (payload?.payments ?? []); // normal: data.payments
        const list = Array.isArray(raw) ? raw : [];
        setPayments(list);
        // Sum up completed payments
        const total = list
          .filter((p) => p.status === 'completed')
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        setTotalEarned(total);
      } catch (e) {
        console.warn('Failed to load payment history', e);
      } finally {
        setLoading(false);
      }
    };
    loadPayments();
  }, [user?.id]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={colors.backgroundDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Total Earnings Banner */}
      <View style={styles.earningsBanner}>
        <MaterialIcons name="account-balance-wallet" size={32} color={colors.backgroundDark} />
        <View>
          <Text style={styles.earningsLabel}>Total Earned</Text>
          <Text style={styles.earningsAmount}>₹{totalEarned.toFixed(2)}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : payments.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="account-balance-wallet" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No payments yet</Text>
            <Text style={styles.emptySubText}>Payments you receive will appear here</Text>
          </View>
        ) : (
          payments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} />
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 48,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.backgroundDark,
  },
  earningsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  earningsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.backgroundDark,
    opacity: 0.8,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.backgroundDark,
  },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardMain: { flex: 1 },
  jobType: { fontSize: 16, fontWeight: '700', color: '#131811' },
  farmerName: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  amountBlock: { alignItems: 'flex-end' },
  amount: { fontSize: 22, fontWeight: '900', color: '#131811' },
  methodLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '700', letterSpacing: 1 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#9CA3AF' },
  emptySubText: { fontSize: 14, color: '#D1D5DB', textAlign: 'center' },
});

export default WorkerPaymentHistoryScreen;
