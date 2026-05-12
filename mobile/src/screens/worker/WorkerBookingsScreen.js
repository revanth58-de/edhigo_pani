// WorkerBookingsScreen - View jobs accepted and completed by the worker
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { jobAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import useAuthStore from '../../store/authStore';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';

const STATUS_META = {
  pending: { label: 'Waiting', color: '#F59E0B', bg: '#FEF3C7', icon: 'schedule' },
  accepted: { label: 'Accepted', color: '#3B82F6', bg: '#EFF6FF', icon: 'check-circle' },
  in_progress: { label: 'Under Process', color: '#8B5CF6', bg: '#F5F3FF', icon: 'play-circle' },
  finishing: { label: 'Finishing', color: '#06B6D4', bg: '#CFFAFE', icon: 'done' },
  completed: { label: 'Completed', color: '#10B981', bg: '#D1FAE5', icon: 'task-alt' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2', icon: 'cancel' },
};

const JobBookingCard = ({ job, navigation }) => {
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
              <TouchableOpacity 
                onPress={async () => {
                  Alert.alert('Withdraw', 'Are you sure you want to withdraw from this job?', [
                    { text: 'No', style: 'cancel' },
                    { text: 'Yes', style: 'destructive', onPress: async () => {
                      try {
                        await jobAPI.withdrawJob(job.id);
                        Alert.alert('Withdrawn', 'You have successfully withdrawn from this job.');
                        loadBookings();
                      } catch (e) {
                        Alert.alert('Error', 'Could not withdraw from job.');
                      }
                    }},
                  ]);
                }}
              >
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
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadBookings = async () => {
        setLoading(true);
        try {
          const response = await jobAPI.getWorkerJobs(); 
          const list = response?.data?.data || [];
          setBookings(list);
        } catch (e) {
          console.error('Load bookings error:', e);
        } finally {
          setLoading(false);
        }
      };

      loadBookings();
    }, [])
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <TopBar title="My Bookings" showBack navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-note" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No bookings found</Text>
            <Text style={styles.emptySubText}>Your job bookings will appear here</Text>
          </View>
        ) : (
          bookings.map((job) => (
            <JobBookingCard key={job.id} job={job} navigation={navigation} />
          ))
        )}
      </ScrollView>

      <BottomNavBar role="worker" activeTab="Bookings" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
    marginTop: 4
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
  emptySubText: { fontSize: 15, color: '#D1D5DB', textAlign: 'center' },
});

export default WorkerBookingsScreen;
