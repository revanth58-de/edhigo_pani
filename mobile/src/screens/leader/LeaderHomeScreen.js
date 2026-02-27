// Screen 25: Leader Home - Exact match to leader-home-start-group.html
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';
import { jobAPI } from '../../services/api';

const STATUS_META = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7', icon: 'schedule' },
  accepted: { label: 'Accepted', color: '#3B82F6', bg: '#EFF6FF', icon: 'check-circle' },
  in_progress: { label: 'In Progress', color: '#8B5CF6', bg: '#F5F3FF', icon: 'play-circle' },
  completed: { label: 'Completed', color: '#10B981', bg: '#D1FAE5', icon: 'task-alt' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2', icon: 'cancel' },
};

const WORK_ICONS = {
  Sowing: 'grass',
  Harvesting: 'agriculture',
  Irrigation: 'water-drop',
  Labour: 'engineering',
  Tractor: 'agriculture',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const JobCard = ({ job }) => {
  const status = STATUS_META[job.status] || STATUS_META.completed;
  const workIcon = WORK_ICONS[job.workType] || 'work';

  return (
    <View style={historyStyles.card}>
      <View style={historyStyles.cardHeader}>
        <View style={[historyStyles.workIconCircle, { backgroundColor: `${colors.primary}15` }]}>
          <MaterialIcons name={workIcon} size={28} color={colors.primary} />
        </View>
        <View style={historyStyles.cardHeaderText}>
          <Text style={historyStyles.workType}>{job.workType || 'Farm Work'}</Text>
          <Text style={historyStyles.jobDate}>{formatDate(job.createdAt)}</Text>
        </View>
        <View style={[historyStyles.statusBadge, { backgroundColor: status.bg }]}>
          <MaterialIcons name={status.icon} size={14} color={status.color} />
          <Text style={[historyStyles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={historyStyles.cardDetails}>
        <View style={historyStyles.detailRow}>
          <MaterialIcons name="location-on" size={16} color="#9CA3AF" />
          <Text style={historyStyles.detailText}>{job.village || 'Location'}</Text>
        </View>
        <View style={historyStyles.detailRow}>
          <MaterialIcons name="currency-rupee" size={16} color="#9CA3AF" />
          <Text style={historyStyles.detailText}>₹{job.wagePerDay || job.payPerDay || '500'}</Text>
        </View>
      </View>
    </View>
  );
};

const LeaderHomeScreen = ({ navigation, route }) => {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';
  const activeTab = route.params?.tab || 'home';

  useEffect(() => {
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <TopBar title={t('leader.leaderHome')} navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <MaterialIcons name="emoji-people" size={64} color={colors.primary} />
          <Text style={styles.welcomeTitle}>{t('common.namaste')}, {user?.name || 'Leader'}!</Text>
          <Text style={styles.welcomeSubtitle}>{t('worker.readyToEarn')}</Text>
        </View>


        {/* Main Action - Start Group */}
        <TouchableOpacity
          style={styles.startGroupButton}
          onPress={() => navigation.navigate('GroupSetup')}
          activeOpacity={0.9}
        >
          <View style={styles.startGroupIcon}>
            <MaterialIcons name="group-add" size={64} color={colors.backgroundDark} />
          </View>
          <Text style={styles.startGroupText}>{t('leader.createGroup').toUpperCase()}</Text>
          <Text style={styles.startGroupSubtext}>Tap to create a group and find work</Text>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="groups" size={32} color={colors.primary} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Active Groups</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="work" size={32} color={colors.primary} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.helpCard}>
          <MaterialIcons name="info" size={24} color={colors.primary} />
          <View style={styles.helpText}>
            <Text style={styles.helpTitle}>How it works</Text>
            <Text style={styles.helpDescription}>
              1. Create a group{'\n'}
              2. Add workers{'\n'}
              3. Find jobs together{'\n'}
              4. Earn more!
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* History Overlay */}
      {activeTab === 'history' && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#F9FAFB', zIndex: 100 }]}>
          <TopBar title="Group History" showBack navigation={navigation} onHelp={() => navigation.setParams({ tab: 'home' })} />
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
            <View style={historyStyles.summaryRow}>
              <Text style={historyStyles.summaryText}>Recent group work history</Text>
            </View>

            <JobCard job={{ workType: 'Harvesting', createdAt: new Date().toISOString(), status: 'completed', village: 'Gachibowli', payPerDay: 500 }} />
            <JobCard job={{ workType: 'Sowing', createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'completed', village: 'Kondapur', payPerDay: 450 }} />
            <JobCard job={{ workType: 'Irrigation', createdAt: new Date(Date.now() - 172800000).toISOString(), status: 'completed', village: 'Madhapur', payPerDay: 400 }} />

            <TouchableOpacity
              style={historyStyles.closeBtn}
              onPress={() => navigation.setParams({ tab: 'home' })}
            >
              <Text style={historyStyles.closeBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Bottom Navigation */}
      <BottomNavBar role="leader" activeTab={activeTab === 'history' ? 'History' : 'Home'} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}33`,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
    flex: 1,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
    paddingHorizontal: 16,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#131811',
    marginTop: 16,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6f8961',
    marginTop: 8,
    textAlign: 'center',
  },
  voicePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: `${colors.primary}1A`,
    padding: 16,
    borderRadius: 24,
    marginTop: 24,
  },
  voicePromptText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
  },
  startGroupButton: {
    backgroundColor: colors.primary,
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  startGroupIcon: {
    marginBottom: 16,
  },
  startGroupText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.backgroundDark,
    marginBottom: 8,
  },
  startGroupSubtext: {
    fontSize: 14,
    color: colors.backgroundDark,
    opacity: 0.8,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#131811',
  },
  statLabel: {
    fontSize: 12,
    color: '#6f8961',
    textAlign: 'center',
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  helpText: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 8,
  },
  helpDescription: {
    fontSize: 14,
    color: '#6f8961',
    lineHeight: 22,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 32,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6f8961',
    textTransform: 'uppercase',
  },
  navTextActive: {
    color: colors.primary,
  },
});

const historyStyles = StyleSheet.create({
  summaryRow: { marginBottom: 16 },
  summaryText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
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
  detailText: { fontSize: 13, color: '#6B7280' },
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

export default LeaderHomeScreen;
