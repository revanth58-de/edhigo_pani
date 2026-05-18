/**
 * WorkHistory
 * M1 SPLIT: Extracted from WorkerHomeScreen.
 *
 * The full-screen history overlay that renders when activeTab === 'history'.
 * Includes the JobCard sub-component and historyStyles — all previously
 * inlined in WorkerHomeScreen.
 *
 * ALSO FIXES: The original JobCard component had JSX but no `return` statement,
 * meaning it silently rendered nothing. Fixed here.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import TopBar from '../TopBar';

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_META = {
  pending:     { label: 'Pending',     color: '#F59E0B', bg: '#FEF3C7', icon: 'schedule' },
  accepted:    { label: 'Accepted',    color: '#3B82F6', bg: '#EFF6FF', icon: 'check-circle' },
  in_progress: { label: 'In Progress', color: '#8B5CF6', bg: '#F5F3FF', icon: 'play-circle' },
  completed:   { label: 'Completed',   color: '#10B981', bg: '#D1FAE5', icon: 'task-alt' },
  cancelled:   { label: 'Cancelled',   color: '#EF4444', bg: '#FEE2E2', icon: 'cancel' },
};

const WORK_ICONS = {
  Sowing: 'grass', Harvesting: 'agriculture', Irrigation: 'water-drop',
  Labour: 'engineering', Tractor: 'agriculture',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

// ── JobCard ────────────────────────────────────────────────────────────────────

const JobCard = ({ job }) => {
  const status   = STATUS_META[job.status] || STATUS_META.pending;
  const workIcon = WORK_ICONS[job.workType] || 'work';

  // BUG FIX: Original code was missing `return` — JSX was unreachable.
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.workIconCircle, { backgroundColor: `${colors.primary}10` }]}>
          <MaterialIcons name={workIcon} size={28} color={colors.primary} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.workType}>{job.workType || 'Farm Work'}</Text>
          <Text style={styles.jobDate}>{formatDate(job.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <MaterialIcons name={status.icon} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={16} color="#9CA3AF" />
          <Text style={styles.detailText} numberOfLines={1}>
            {job.farmAddress || 'Location not set'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="payments" size={16} color="#9CA3AF" />
          <Text style={styles.detailText}>₹{job.wagePerDay || job.payPerDay || '—'}/day</Text>
        </View>
        {/* M11: Show job description if the farmer added one */}
        {job.description ? (
          <View style={styles.detailRow}>
            <MaterialIcons name="notes" size={16} color="#9CA3AF" />
            <Text style={styles.detailText} numberOfLines={2}>{job.description}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

// ── WorkHistory ────────────────────────────────────────────────────────────────

const WorkHistory = ({ jobs, loading, navigation, onClose, onRefresh }) => (
  <View style={styles.overlay}>
    <TopBar
      title="Work History"
      showBack
      navigation={navigation}
      onBack={onClose}
    />
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        // M6: Pull-to-refresh on the history list
        <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <Text style={styles.summaryText}>Your recent work history</Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : jobs.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="history" size={56} color="#D1D5DB" />
          <Text style={styles.emptyText}>No work history yet</Text>
          <Text style={styles.emptySubText}>Jobs you complete will appear here</Text>
        </View>
      ) : (
        jobs.map((job) => <JobCard key={job.id} job={job} />)
      )}

      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  </View>
);

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F9FAFB',
    zIndex: 100,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  summaryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 16,
  },
  // ── JobCard ────────────────
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  workIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardHeaderText: { flex: 1 },
  workType: { fontSize: 16, fontWeight: '700', color: '#131811' },
  jobDate: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDetails: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#6B7280', flex: 1 },
  // ── Empty State ─────────────
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#9CA3AF' },
  emptySubText: { fontSize: 14, color: '#D1D5DB' },
  // ── Close Button ────────────
  closeBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default WorkHistory;
