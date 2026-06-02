import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomLoader from '../../components/CustomLoader';
import { colors } from '../../theme/colors';
import { workerAPI } from '../../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const EarningsHistoryScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async (isRef = false) => {
    if (!isRef) setLoading(true);
    try {
      const res = await workerAPI.getEarnings();
      setPayments(res?.data?.recentPayments || res?.recentPayments || []);
    } catch (e) {
      console.warn('Failed to fetch earnings history:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(true);
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'settled':
        return { bg: '#ECFDF5', text: '#059669', label: 'Settled' };
      case 'processing':
        return { bg: '#EFF6FF', text: '#2563EB', label: 'Processing' };
      default:
        return { bg: '#FEF3C7', text: '#D97706', label: 'Pending Settlement' };
    }
  };

  const renderItem = ({ item }) => {
    const status = getStatusStyle(item.settlementStatus);
    const dateStr = item.paidAt || item.createdAt;
    const formattedDate = dateStr
      ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

    return (
      <TouchableOpacity
        style={styles.paymentCard}
        onPress={() => navigation.navigate('WorkerPaymentDetails', { payment: item })}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <View style={styles.farmerContainer}>
            <View style={styles.avatarCircle}>
              <MaterialIcons name="person" size={20} color="#6F8961" />
            </View>
            <View>
              <Text style={styles.farmerName}>{item.farmerName || 'Farmer'}</Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.breakupItem}>
            <Text style={styles.breakupLabel}>Job Type</Text>
            <Text style={styles.breakupVal}>{item.workType?.toUpperCase() || 'AGRICULTURE WORK'}</Text>
          </View>
          <View style={styles.breakupItem}>
            <Text style={styles.breakupLabel}>Farmer Paid</Text>
            <Text style={styles.breakupValGross}>{formatINR(item.amount)}</Text>
          </View>
          <View style={styles.breakupItem}>
            <Text style={styles.breakupLabel}>Dinasari 5% fee</Text>
            <Text style={styles.breakupValFee}>- {formatINR(item.commissionAmount || (item.amount * 0.05))}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <Text style={styles.netLabel}>Your Earning (95%)</Text>
          <Text style={styles.netAmount}>{formatINR(item.workerAmount || (item.amount * 0.95))}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#FDFBF7', '#FFFBF0', '#FFF7E6']}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#131811" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EARNINGS HISTORY</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <CustomLoader size={48} color={colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="account-balance-wallet" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No earnings yet</Text>
          <Text style={styles.emptySub}>Your earnings will show up here as soon as you complete a job!</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
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
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  farmerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F2F4F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardBody: {
    gap: 8,
    marginBottom: 16,
  },
  breakupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakupLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  breakupVal: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '700',
  },
  breakupValGross: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '700',
  },
  breakupValFee: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netLabel: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '800',
  },
  netAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10B981',
  },
});

export default EarningsHistoryScreen;
