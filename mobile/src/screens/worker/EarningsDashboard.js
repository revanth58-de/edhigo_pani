/**
 * EarningsDashboard.js
 * F1: Worker Earnings Dashboard
 *
 * Shows a worker their complete earnings picture:
 *  ┌─────────────────────────────────────┐
 *  │  Total Earned   This Month  This Wk │  ← Summary cards
 *  ├─────────────────────────────────────┤
 *  │  ▇▇▂▃▅▇  6-month earnings trend    │  ← Bar chart (pure RN, no library)
 *  ├─────────────────────────────────────┤
 *  │  Work Type breakdown (pie-style)    │  ← Progress bars per work type
 *  ├─────────────────────────────────────┤
 *  │  Recent Payments list              │  ← Last 20 payments
 *  └─────────────────────────────────────┘
 *
 * Pure React Native — no charting library dependency.
 * All visualizations are built with View/width math.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Platform, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import { workerAPI } from '../../services/api';

// ── Work type colors ───────────────────────────────────────────────────────────
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

// ── Formatters ─────────────────────────────────────────────────────────────────
const formatINR = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

// ── Sub-components ─────────────────────────────────────────────────────────────

// Summary card at the top
const StatCard = ({ label, value, icon, accent, small }) => (
  <View style={[styles.statCard, small && styles.statCardSmall]}>
    <MaterialIcons name={icon} size={small ? 18 : 22} color={accent} />
    <Text style={[styles.statValue, small && styles.statValueSmall]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// Pure RN bar chart — no library
const BarChart = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.total), 1);
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.sectionTitle}>6-Month Trend</Text>
      <View style={styles.barRow}>
        {data.map((d, i) => {
          const heightPct = d.total / maxVal;
          const barH = Math.max(heightPct * 100, 4); // min 4px for zero bars
          return (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barAmount}>{d.total > 0 ? formatINR(d.total) : ''}</Text>
              <View style={styles.barTrack}>
                <LinearGradient
                  colors={d.total > 0 ? [colors.primary, `${colors.primary}80`] : ['#E5E7EB', '#E5E7EB']}
                  style={[styles.bar, { height: barH }]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />
              </View>
              <Text style={styles.barLabel}>{d.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Work type breakdown — horizontal progress bars
const WorkTypeBreakdown = ({ data }) => {
  if (!data || data.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>By Work Type</Text>
      {data.map((item) => {
        const cfg = getWorkConfig(item.workType);
        return (
          <View key={item.workType} style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <View style={[styles.breakdownIconCircle, { backgroundColor: `${cfg.color}15` }]}>
                <MaterialIcons name={cfg.icon} size={16} color={cfg.color} />
              </View>
              <View>
                <Text style={styles.breakdownType}>{item.workType}</Text>
                <Text style={styles.breakdownCount}>{item.count} job{item.count !== 1 ? 's' : ''}</Text>
              </View>
            </View>
            <View style={styles.breakdownRight}>
              <Text style={[styles.breakdownAmount, { color: cfg.color }]}>{formatINR(item.total)}</Text>
              <Text style={styles.breakdownPercent}>{item.percent}%</Text>
            </View>
            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${item.percent}%`, backgroundColor: cfg.color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Recent payment row
const PaymentRow = ({ payment }) => {
  const cfg = getWorkConfig(payment.workType);
  const isUPI = payment.method === 'upi';
  return (
    <View style={styles.paymentRow}>
      <View style={[styles.paymentIconCircle, { backgroundColor: `${cfg.color}15` }]}>
        <MaterialIcons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentType}>{payment.workType}</Text>
        <Text style={styles.paymentMeta} numberOfLines={1}>
          {payment.farmerName} • {formatDate(payment.paidAt || payment.createdAt)}
        </Text>
        <Text style={styles.paymentAddress} numberOfLines={1}>{payment.farmAddress}</Text>
      </View>
      <View style={styles.paymentAmountCol}>
        <Text style={styles.paymentAmount}>{formatINR(payment.amount)}</Text>
        <View style={[styles.methodBadge, isUPI && styles.methodBadgeUPI]}>
          <Text style={[styles.methodText, isUPI && styles.methodTextUPI]}>
            {isUPI ? 'UPI' : 'CASH'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ── EarningsDashboard ──────────────────────────────────────────────────────────

const EarningsDashboard = ({ navigation }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

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

      <TopBar title="My Earnings" navigation={navigation} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading earnings...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialIcons name="wifi-off" size={56} color="#D1D5DB" />
          <Text style={styles.errorText}>Couldn't load earnings</Text>
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
          {/* ── Hero total ─────────────────────────────────────────────── */}
          <LinearGradient
            colors={[colors.primary, `${colors.primary}CC`]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroLabel}>TOTAL EARNED</Text>
            <Text style={styles.heroAmount}>{formatINR(summary.totalEarned)}</Text>
            <Text style={styles.heroSub}>{summary.totalJobs || 0} jobs completed</Text>
            {summary.pendingAmount > 0 && (
              <View style={styles.pendingBadge}>
                <MaterialIcons name="pending" size={14} color="#FEF3C7" />
                <Text style={styles.pendingText}>{formatINR(summary.pendingAmount)} pending (UPI)</Text>
              </View>
            )}
          </LinearGradient>

          {/* ── Stat row ───────────────────────────────────────────────── */}
          <View style={styles.statRow}>
            <StatCard
              label="This Month"
              value={formatINR(summary.thisMonth)}
              icon="calendar-today"
              accent="#3B82F6"
              small
            />
            <StatCard
              label="This Week"
              value={formatINR(summary.thisWeek)}
              icon="date-range"
              accent="#10B981"
              small
            />
            <StatCard
              label="Avg / Job"
              value={formatINR(summary.avgPerJob)}
              icon="trending-up"
              accent="#F59E0B"
              small
            />
          </View>

          {/* ── 6-month bar chart ─────────────────────────────────────── */}
          {data?.byMonth?.length > 0 && <BarChart data={data.byMonth} />}

          {/* ── Work type breakdown ───────────────────────────────────── */}
          <WorkTypeBreakdown data={data?.byWorkType} />

          {/* ── Recent payments ───────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            {data?.recentPayments?.length === 0 ? (
              <View style={styles.emptyPayments}>
                <MaterialIcons name="payments" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>No payments received yet</Text>
                <Text style={styles.emptySubText}>Accept a job to start earning</Text>
              </View>
            ) : (
              data?.recentPayments?.map(p => <PaymentRow key={p.id} payment={p} />)
            )}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </LinearGradient>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

  // Hero
  heroCard: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 28, padding: 28,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35, shadowRadius: 24, elevation: 18,
  },
  heroLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginBottom: 8 },
  heroAmount: { fontSize: 48, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: 12,
  },
  pendingText: { color: '#FEF3C7', fontSize: 12, fontWeight: '700' },

  // Stat row
  statRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 14 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statCardSmall: { padding: 12 },
  statValue: { fontSize: 18, fontWeight: '900', color: '#131811' },
  statValueSmall: { fontSize: 15 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, textAlign: 'center' },

  // Bar chart
  chartContainer: {
    margin: 16, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 16, height: 130 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barAmount: { fontSize: 8, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '600', textAlign: 'center' },

  // Section
  section: {
    marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFFFFF',
    borderRadius: 22, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#131811', marginBottom: 16 },

  // Breakdown
  breakdownRow: { marginBottom: 14 },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownIconCircle: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  breakdownType: { fontSize: 14, fontWeight: '700', color: '#131811' },
  breakdownCount: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  breakdownRight: { position: 'absolute', right: 0, top: 0, alignItems: 'flex-end' },
  breakdownAmount: { fontSize: 15, fontWeight: '800' },
  breakdownPercent: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  progressTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, marginTop: 8 },
  progressFill: { height: 6, borderRadius: 3 },

  // Payment rows
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  paymentIconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  paymentInfo: { flex: 1 },
  paymentType: { fontSize: 14, fontWeight: '700', color: '#131811' },
  paymentMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  paymentAddress: { fontSize: 11, color: '#D1D5DB', marginTop: 1 },
  paymentAmountCol: { alignItems: 'flex-end', gap: 4 },
  paymentAmount: { fontSize: 16, fontWeight: '900', color: '#131811' },
  methodBadge: {
    backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  methodBadgeUPI: { backgroundColor: '#EFF6FF' },
  methodText: { fontSize: 10, fontWeight: '800', color: '#6B7280' },
  methodTextUPI: { color: '#3B82F6' },

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
