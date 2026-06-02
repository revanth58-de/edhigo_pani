/**
 * EarningsDashboard.js
 * F1: Worker Earnings & Wallet Dashboard
 *
 * Provides a highly secure, readable, and premium financial interface.
 * Shows:
 *  - Total Earnings
 *  - Settled share vs Pending Settlements
 *  - Week breakdown
 *  - Visual progress
 *  - Recent logs with direct detail navigation
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import CustomLoader from '../../components/CustomLoader';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';
import useAuthStore from '../../store/authStore';
import { workerAPI } from '../../services/api';

const WORK_TYPE_CONFIG = {
  Sowing:     { color: '#10B981', icon: 'grass' },
  Harvesting: { color: '#F59E0B', icon: 'agriculture' },
  Irrigation: { color: '#3B82F6', icon: 'water-drop' },
  Labour:     { color: '#8B5CF6', icon: 'engineering' },
  Tractor:    { color: '#EF4444', icon: 'agriculture' },
  Other:      { color: '#6B7280', icon: 'work' },
};

const getWorkConfig = (workType) =>
  WORK_TYPE_CONFIG[workType] || WORK_TYPE_CONFIG.Other;

const formatINR = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const EarningsDashboard = ({ navigation }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const { user } = useAuthStore();
  const role = user?.role || 'worker';

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await workerAPI.getEarnings();
      setData(res?.data || res);
    } catch (e) {
      console.warn('Earnings fetch failed:', e.message);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { fetchEarnings(); }, [fetchEarnings])
  );

  const summary = data?.summary || {};

  return (
    <LinearGradient colors={['#FDFBF7', colors.backgroundLight]} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      <TopBar title="Worker Wallet" navigation={navigation} showBack />

      {loading ? (
        <View style={styles.centered}>
          <CustomLoader size={48} color={colors.primary} />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialIcons name="wifi-off" size={56} color="#D1D5DB" />
          <Text style={styles.errorText}>Couldn't load wallet details</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchEarnings}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchEarnings} colors={[colors.primary]} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Wallet Header balance card */}
          <LinearGradient
            colors={['#15803D', '#16A34A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.walletHeaderRow}>
              <MaterialIcons name="account-balance-wallet" size={24} color="#FFFFFF" />
              <Text style={styles.heroLabel}>NET WALLET BALANCES</Text>
            </View>
            <Text style={styles.heroAmount}>{formatINR(summary.totalEarned)}</Text>
            <Text style={styles.heroSub}>{summary.totalJobs || 0} jobs successfully completed</Text>

            <TouchableOpacity 
              style={styles.historyShortcut} 
              onPress={() => navigation.navigate('EarningsHistory')}
            >
              <Text style={styles.historyShortcutText}>View Full Earning History</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>

          {/* ── SETTLEMENT BREAKDOWN TILES ── */}
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              {/* Settled Card */}
              <View style={[styles.breakdownCard, styles.breakdownCardSettled]}>
                <View style={styles.cardHeaderIcon}>
                  <MaterialIcons name="check-circle" size={18} color="#059669" />
                  <Text style={styles.tileLabel}>Settled</Text>
                </View>
                <Text style={styles.tileVal}>{formatINR(summary.settledAmount || 0)}</Text>
                <Text style={styles.tileSub}>Paid to Bank</Text>
              </View>

              {/* Pending Settlement Card */}
              <View style={[styles.breakdownCard, styles.breakdownCardPending]}>
                <View style={styles.cardHeaderIcon}>
                  <MaterialIcons name="pending" size={18} color="#D97706" />
                  <Text style={[styles.tileLabel, { color: '#D97706' }]}>Pending</Text>
                </View>
                <Text style={[styles.tileVal, { color: '#D97706' }]}>{formatINR(summary.pendingAmount || summary.pendingSettlement || 0)}</Text>
                <Text style={styles.tileSub}>Locked in verification</Text>
              </View>
            </View>
          </View>

          {/* Stat row */}
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <MaterialIcons name="date-range" size={20} color="#3B82F6" />
              <Text style={styles.statValue}>{formatINR(summary.thisWeek)}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="trending-up" size={20} color="#F59E0B" />
              <Text style={styles.statValue}>{formatINR(summary.avgPerJob)}</Text>
              <Text style={styles.statLabel}>Avg Per Job</Text>
            </View>
          </View>

          {/* ── Recent payments list ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Payments</Text>
              <TouchableOpacity onPress={() => navigation.navigate('EarningsHistory')}>
                <Text style={styles.viewAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {data?.recentPayments?.length === 0 ? (
              <View style={styles.emptyPayments}>
                <MaterialIcons name="payments" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>No payments received yet</Text>
                <Text style={styles.emptySubText}>Accept a job to start earning</Text>
              </View>
            ) : (
              data?.recentPayments?.slice(0, 10).map((p) => {
                const cfg = getWorkConfig(p.workType);
                const isUPI = p.method === 'upi';
                const isSettled = p.settlementStatus === 'settled';

                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.paymentRow}
                    onPress={() => navigation.navigate('WorkerPaymentDetails', { payment: p })}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.paymentIconCircle, { backgroundColor: `${cfg.color}15` }]}>
                      <MaterialIcons name={cfg.icon} size={20} color={cfg.color} />
                    </View>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentType}>{p.workType}</Text>
                      <Text style={styles.paymentMeta} numberOfLines={1}>
                        {p.farmerName} • {formatDate(p.paidAt || p.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.paymentAmountCol}>
                      <Text style={styles.paymentAmount}>{formatINR(p.workerAmount || p.amount)}</Text>
                      <View style={[styles.statusBadge, isSettled ? styles.statusBadgeSettled : styles.statusBadgePending]}>
                        <Text style={[styles.statusText, isSettled ? styles.statusTextSettled : styles.statusTextPending]}>
                          {isSettled ? 'Settled' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
      <BottomNavBar role={role} activeTab="Profile" />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 120 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

  // Hero
  heroCard: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 28, padding: 24,
    alignItems: 'center',
    shadowColor: '#16A34A', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  heroLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 2 },
  heroAmount: { fontSize: 44, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' },
  historyShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 18,
  },
  historyShortcutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Breakdown Card
  breakdownContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 12,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  breakdownCardSettled: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  breakdownCardPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  cardHeaderIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
  },
  tileVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10B981',
    marginTop: 8,
  },
  tileSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '600',
  },

  // Stat row
  statRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 14 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 10, elevation: 2,
  },
  statValue: { fontSize: 18, fontWeight: '900', color: '#131811' },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },

  // Section
  section: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: '#FFFFFF',
    borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 10, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#131811' },
  viewAllText: { fontSize: 12, fontWeight: '800', color: colors.primary },

  // Payment rows
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  paymentIconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  paymentInfo: { flex: 1 },
  paymentType: { fontSize: 14, fontWeight: '700', color: '#131811' },
  paymentMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  paymentAmountCol: { alignItems: 'flex-end', gap: 4 },
  paymentAmount: { fontSize: 15, fontWeight: '900', color: '#131811' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  statusBadgePending: { backgroundColor: '#FFF9E6' },
  statusBadgeSettled: { backgroundColor: '#ECFDF5' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusTextPending: { color: '#D97706' },
  statusTextSettled: { color: '#059669' },

  // Empty / error
  emptyPayments: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#9CA3AF' },
  emptySubText: { fontSize: 13, color: '#D1D5DB' },
  loadingText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  errorText: { fontSize: 16, fontWeight: '700', color: '#9CA3AF' },
  retryBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 14, marginTop: 8,
  },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default EarningsDashboard;
