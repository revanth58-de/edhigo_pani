// WorkerBookingsScreen - M9: Tabbed view (Active / Completed / Cancelled)
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { jobAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import useAuthStore from '../../store/authStore';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';

const STATUS_META = {
  pending:     { label: 'Waiting',      color: '#F59E0B', bg: '#FEF3C7', icon: 'schedule' },
  accepted:    { label: 'Accepted',     color: '#3B82F6', bg: '#EFF6FF', icon: 'check-circle' },
  in_progress: { label: 'Under Process',color: '#8B5CF6', bg: '#F5F3FF', icon: 'play-circle' },
  finishing:   { label: 'Finishing',    color: '#06B6D4', bg: '#CFFAFE', icon: 'done' },
  completed:   { label: 'Completed',    color: '#10B981', bg: '#D1FAE5', icon: 'task-alt' },
  cancelled:   { label: 'Cancelled',    color: '#EF4444', bg: '#FEE2E2', icon: 'cancel' },
};

// M9: Tab definitions — which statuses belong to each tab
const TABS = [
  {
    key: 'active',
    label: 'Active',
    icon: 'work',
    statuses: ['pending', 'accepted', 'in_progress', 'finishing'],
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: 'task-alt',
    statuses: ['completed'],
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    icon: 'cancel',
    statuses: ['cancelled'],
  },
];

const JobBookingCard = ({ job, navigation, onWithdraw }) => {
  const status = STATUS_META[job.status] || STATUS_META.pending;

  const handlePress = () => {
    if (job.status === 'in_progress' || job.status === 'finishing') {
      navigation.navigate('WorkStatus', { job });
    } else if (job.status === 'accepted') {
      navigation.navigate('Navigation', { job });
    }
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={handlePress}>
      <View style={styles.cardTop}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="work" size={28} color={colors.primary} />
        </View>
        <View style={styles.cardMain}>
          <Text style={styles.jobType}>{job.workType || 'Farm Work'}</Text>
          <Text style={styles.farmerName}>Farmer: {job.farmer?.name || 'Someone'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
           <MaterialIcons name={status.icon} size={14} color={status.color} />
           <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
         <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={16} color="#64748B" />
            <Text style={styles.detailText}>{job.village || 'Nearby'}</Text>
         </View>
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {(job.status === 'accepted' || job.status === 'pending') && (
              <TouchableOpacity onPress={() => onWithdraw(job.id)}>
                <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 13 }}>WITHDRAW</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.dateText}>{new Date(job.createdAt).toLocaleDateString()}</Text>
         </View>
      </View>
    </TouchableOpacity>
  );
};

const WorkerBookingsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState('active'); // M9

  const loadBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await jobAPI.getWorkerJobs();
      setBookings(response?.data?.data || []);
    } catch (e) {
      console.error('Load bookings error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { loadBookings(); }, [loadBookings])
  );

  const handleWithdraw = (jobId) => {
    Alert.alert('Withdraw', 'Are you sure you want to withdraw from this job?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes', style: 'destructive', onPress: async () => {
          try {
            await jobAPI.withdrawJob(jobId);
            Alert.alert('Withdrawn', 'You have successfully withdrawn from this job.');
            loadBookings();
          } catch {
            Alert.alert('Error', 'Could not withdraw from job.');
          }
        },
      },
    ]);
  };

  // M9: Filter bookings by active tab's statuses
  const currentTab   = TABS.find(t => t.key === activeTab);
  const filtered     = bookings.filter(j => currentTab.statuses.includes(j.status));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <TopBar title="My Bookings" showBack navigation={navigation} />

      {/* M9: Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const count   = bookings.filter(j => tab.statuses.includes(j.status)).length;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={tab.icon}
                size={16}
                color={isActive ? colors.primary : '#9CA3AF'}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBookings(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name={currentTab.icon} size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No {currentTab.label.toLowerCase()} bookings</Text>
            <Text style={styles.emptySubText}>
              {activeTab === 'active'
                ? 'Accept a job offer to see it here'
                : `Your ${currentTab.label.toLowerCase()} jobs will appear here`}
            </Text>
          </View>
        ) : (
          filtered.map((job) => (
            <JobBookingCard
              key={job.id}
              job={job}
              navigation={navigation}
              onWithdraw={handleWithdraw}
            />
          ))
        )}
      </ScrollView>

      <BottomNavBar role={user?.role} activeTab="Bookings" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // M9: Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeActive: {
    backgroundColor: `${colors.primary}1A`,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  tabBadgeTextActive: {
    color: colors.primary,
  },

  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
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
  jobType: { fontSize: 20, fontWeight: '800', color: '#131811' },
  farmerName: { fontSize: 16, color: '#64748B', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  statusText: { fontSize: 13, fontWeight: '800' },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginTop: 4,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 16, color: '#64748B' },
  dateText: { fontSize: 14, color: '#9CA3AF' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 12,
  },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#9CA3AF' },
  emptySubText: { fontSize: 15, color: '#D1D5DB', textAlign: 'center', paddingHorizontal: 32 },
});

export default WorkerBookingsScreen;
