import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Platform,
  Animated,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import BottomNavBar from '../../components/BottomNavBar';
import WeatherLocationHeader from '../../components/WeatherLocationHeader';
import GlassCard from '../../components/GlassCard';
import { socketService } from '../../services/socketService';
import { jobAPI, authAPI, groupAPI, paymentAPI } from '../../services/api';
import * as Location from 'expo-location';

const LeaderHomeScreen = ({ navigation, route }) => {
  const { user, refreshProfile } = useAuthStore();
  const { t } = useTranslation();
  const activeTab = route.params?.tab || 'home';
  const [pendingJob, setPendingJob]   = useState(null);
  const [refreshing, setRefreshing]   = useState(false); // M6
  const [groups, setGroups] = useState([]);
  const [payments, setPayments] = useState([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Fetch available group jobs from the server (for manual browse / poll fallback)
  const fetchGroupJobs = useCallback(async () => {
    try {
      const response = await jobAPI.getJobs({ status: 'pending', workerType: 'group' });
      const jobs = response?.data?.data || [];
      if (jobs.length > 0 && !pendingJob) {
        // Pick the most recent pending group job as the alert
        const latest = jobs[0];
        setPendingJob({
          jobId: latest.id,
          workType: latest.workType,
          payPerDay: latest.payPerDay,
          workersNeeded: latest.workersNeeded,
          farmAddress: latest.farmAddress,
          farmLatitude: latest.farmLatitude,
          farmLongitude: latest.farmLongitude,
        });
      }
    } catch (e) {
      console.warn('Failed to fetch group jobs:', e.message);
    }
  }, [pendingJob]);

  const fetchStatsAndDetails = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [groupsResp, paymentsResp] = await Promise.all([
        groupAPI.getMyGroups(),
        paymentAPI.getHistory(user.id),
      ]);
      setGroups(groupsResp?.data?.groups || []);
      setPayments(paymentsResp?.data?.payments || []);
    } catch (e) {
      console.warn('Failed to fetch stats details:', e.message);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      fetchGroupJobs();
      fetchStatsAndDetails();

      // Update GPS + status so matchWorkers can find this leader
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.BestForNavigation,
            });
            await authAPI.updateProfile({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              status: 'available',
            });
          }
        } catch (gpsErr) {
          console.warn('Leader GPS update failed:', gpsErr.message);
        }
      })();
    }, [refreshProfile, fetchGroupJobs, fetchStatsAndDetails])
  );

  // Pulse animation for the job alert banner
  useEffect(() => {
    if (!pendingJob) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pendingJob]);

  useEffect(() => {
    if (user?.id) {
      fetchStatsAndDetails();
    }
  }, [user?.id, fetchStatsAndDetails]);

  useEffect(() => {
    if (!user?.id) return;
    socketService.connect();
    socketService.joinUserRoom(user.id);

    // Listen for new group job offers from the farmer
    const handleNewOffer = (jobData) => {
      setPendingJob(jobData);
      // Also show an alert so they don't miss it
      Alert.alert(
        '🌾 New Job Request!',
        `A farmer needs ${jobData.workersNeeded || 'your'} workers for ${jobData.workType} work.\n\nPay: ₹${jobData.payPerDay}/day`,
        [
          { text: 'Ignore', style: 'cancel' },
          {
            text: 'View Offer',
            onPress: () => navigation.navigate('GroupJobOffer', {
              groupId: null, // leader selects group on next screen
              jobData: { ...jobData, id: jobData.jobId },
              workerCount: jobData.workersNeeded,
            }),
          },
        ]
      );
    };

    socketService.onNewOffer(handleNewOffer);
    return () => socketService.offNewOffer(handleNewOffer);
  }, [user?.id]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([refreshProfile(), fetchGroupJobs(), fetchStatsAndDetails()]);
              setRefreshing(false);
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Premium Hero Section */}
        <LinearGradient 
          colors={[colors.primary, colors.primaryDark]} 
          style={styles.heroSection}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.greetingText}>
                {t('common.namaste') || 'Namaste'}, {user?.fullName?.split(' ')[0] || 'Leader'}
              </Text>
              <Text style={styles.heroSubText}>Empower your group today.</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <MaterialIcons name="notifications-none" size={24} color="#FFF" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <WeatherLocationHeader />

        {/* ── Incoming Job Alert Banner ── */}
        {pendingJob && (
          <Animated.View style={[styles.jobAlertBanner, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={['#FFFBEB', '#FEF3C7']}
              style={styles.jobAlertGradient}
            >
              <View style={styles.jobAlertLeft}>
                <View style={styles.jobAlertIcon}>
                  <MaterialIcons name="agriculture" size={24} color="#D97706" />
                </View>
                <View style={styles.jobAlertText}>
                  <Text style={styles.jobAlertTitle}>🌾 New Job Request!</Text>
                  <Text style={styles.jobAlertSub} numberOfLines={1}>
                    {pendingJob.workType} • ₹{pendingJob.payPerDay}/day • {pendingJob.workersNeeded} workers
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.jobAlertBtn}
                onPress={() => {
                  navigation.navigate('GroupJobOffer', {
                    groupId: null,
                    jobData: { ...pendingJob, id: pendingJob.jobId },
                    workerCount: pendingJob.workersNeeded,
                  });
                  setPendingJob(null);
                }}
              >
                <Text style={styles.jobAlertBtnText}>VIEW</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Main Group Actions */}
        <View style={styles.mainActions}>
          <TouchableOpacity 
            style={styles.primaryAction} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('GroupSetup')}
          >
            <LinearGradient colors={colors.primaryGradient} style={styles.actionGradient}>
              <MaterialIcons name="group-add" size={40} color="#FFF" />
              <Text style={styles.actionTitle}>CREATE GROUP</Text>
              <Text style={styles.actionSub}>Bring your team together</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryAction} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Groups')}
          >
            <MaterialIcons name="groups" size={32} color={colors.primary} />
            <Text style={styles.secondaryActionTitle}>MY GROUPS</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryAction, { borderColor: '#D97706', marginTop: 0 }]} 
            activeOpacity={0.9}
            onPress={() => {
              if (pendingJob) {
                navigation.navigate('GroupJobOffer', {
                  groupId: null,
                  jobData: { ...pendingJob, id: pendingJob.jobId },
                  workerCount: pendingJob.workersNeeded,
                });
              } else {
                Alert.alert('No Offers', 'No job offers right now. You will be alerted when a farmer sends a request.');
              }
            }}
          >
            {pendingJob && (
              <View style={styles.offerBadge}>
                <Text style={styles.offerBadgeText}>1</Text>
              </View>
            )}
            <MaterialIcons name="work" size={32} color="#D97706" />
            <Text style={[styles.secondaryActionTitle, { color: '#D97706' }]}>JOB{"\n"}OFFERS</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.statsGrid}>
            <GlassCard intensity={10} style={styles.statCardOuter} contentStyle={styles.statCardInner}>
              <Text style={styles.statVal}>{user?.groupsLed ?? 0}</Text>
              <Text style={styles.statLab}>Active Groups</Text>
            </GlassCard>
            <GlassCard intensity={10} style={styles.statCardOuter} contentStyle={styles.statCardInner}>
              <Text style={styles.statVal}>{user?.jobsDone ?? 0}</Text>
              <Text style={styles.statLab}>Jobs Completed</Text>
            </GlassCard>
            <GlassCard intensity={10} style={styles.statCardOuter} contentStyle={styles.statCardInner}>
              <Text style={styles.statVal}>
                {user?.ratingAvg && user?.ratingAvg > 0 ? `⭐ ${user.ratingAvg.toFixed(1)}` : '⭐ 5.0'}
              </Text>
              <Text style={styles.statLab}>Avg Rating</Text>
            </GlassCard>
          </View>
        </View>

        {/* Group Wallet Section */}
        {(() => {
          const completedPayments = payments.filter(p => p.workerId === user?.id && p.status === 'completed');
          const totalEarned = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          const pendingPayments = payments.filter(p => p.workerId === user?.id && p.status === 'pending');
          const pendingEarned = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

          return (
            <View style={styles.walletSection}>
              <Text style={styles.sectionTitle}>Group Wallet</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('EarningsHistory')}
              >
                <GlassCard intensity={15} style={styles.walletCardOuter} contentStyle={styles.walletCardInner}>
                  <View style={styles.walletHeaderRow}>
                    <View style={styles.walletTitleCol}>
                      <Text style={styles.walletLabelText}>TOTAL EARNINGS</Text>
                      <Text style={styles.walletValueText}>₹{totalEarned.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.walletIconContainer}>
                      <MaterialIcons name="account-balance-wallet" size={32} color="#FFF" />
                    </View>
                  </View>

                  <View style={styles.walletDivider} />

                  <View style={styles.walletSubRow}>
                    <View style={styles.walletSubCol}>
                      <Text style={styles.walletSubLabel}>Pending Settlement</Text>
                      <Text style={styles.walletSubValue}>₹{pendingEarned.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.walletSubCol}>
                      <Text style={styles.walletSubLabel}>Transactions</Text>
                      <Text style={styles.walletSubValue}>{completedPayments.length + pendingPayments.length} Total</Text>
                    </View>
                  </View>

                  {payments.length > 0 && (
                    <View style={styles.recentTxSection}>
                      <Text style={styles.txListTitle}>Recent Group Earnings</Text>
                      {payments.slice(0, 3).map((p) => (
                        <View key={p.id} style={styles.txRow}>
                          <View style={styles.txLeft}>
                            <MaterialIcons 
                              name={p.status === 'completed' ? "check-circle" : "watch-later"} 
                              size={20} 
                              color={p.status === 'completed' ? "#10B981" : "#D97706"} 
                            />
                            <Text style={styles.txWorkType}>{p.job?.workType ? p.job.workType.toUpperCase() : 'FARM WORK'}</Text>
                          </View>
                          <View style={styles.txRight}>
                            <Text style={styles.txAmount}>₹{p.amount}</Text>
                            <Text style={[styles.txStatus, { color: p.status === 'completed' ? "#10B981" : "#D97706" }]}>
                              {p.status === 'completed' ? 'Paid' : 'Pending'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </GlassCard>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Attendance Tracker Section */}
        {(() => {
          const ledGroups = groups.filter(g => g.leaderId === user?.id);
          if (ledGroups.length === 0) return null;
          return (
            <View style={styles.attendanceSection}>
              <Text style={styles.sectionTitle}>Attendance Tracker</Text>
              {ledGroups.map((group) => {
                const joinedMembers = (group.members || []).filter(
                  m => m.status === 'joined' || m.status === 'checked_in' || m.status === 'checked_out'
                );
                const checkedInCount = (group.members || []).filter(m => m.status === 'checked_in').length;
                
                return (
                  <GlassCard key={group.id} intensity={10} style={styles.attendanceCardOuter} contentStyle={styles.attendanceCardInner}>
                    <View style={styles.groupHeaderRow}>
                      <View style={styles.groupMetaCol}>
                        <Text style={styles.groupNameText}>{group.name}</Text>
                        <Text style={styles.groupTypeText}>{group.type || 'General Work'}</Text>
                      </View>
                      <View style={styles.attendanceBadge}>
                        <Text style={styles.attendanceBadgeText}>
                          Present: {checkedInCount}/{joinedMembers.length + 1}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.membersListHeader}>
                      <Text style={styles.membersListTitle}>Crew Attendance Status</Text>
                    </View>

                    {/* Leader Row */}
                    <View style={styles.memberRow}>
                      <View style={styles.memberLeft}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarLetter}>L</Text>
                        </View>
                        <View>
                          <Text style={styles.memberName}>{user?.name || 'Leader'} (You)</Text>
                          <Text style={styles.memberRole}>Leader</Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, styles.badgeActive]}>
                        <Text style={styles.badgeTextActive}>🟢 PRESENT</Text>
                      </View>
                    </View>

                    {/* Members Rows */}
                    {joinedMembers.length === 0 ? (
                      <Text style={styles.noMembersText}>No group members joined yet.</Text>
                    ) : (
                      joinedMembers.map((m) => {
                        const name = m.name || m.worker?.name || 'Worker';
                        const role = m.role || 'Member';
                        
                        let badgeStyle = styles.badgeInvited;
                        let badgeText = '⚪ INVITED';
                        
                        if (m.status === 'checked_in') {
                          badgeStyle = styles.badgeActive;
                          badgeText = '🟢 PRESENT';
                        } else if (m.status === 'checked_out') {
                          badgeStyle = styles.badgeCompleted;
                          badgeText = '🔵 COMPLETED';
                        } else if (m.status === 'joined') {
                          badgeStyle = styles.badgeJoined;
                          badgeText = '🟡 READY';
                        }

                        return (
                          <View key={m.id} style={styles.memberRow}>
                            <View style={styles.memberLeft}>
                              <View style={styles.avatarCircle}>
                                <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
                              </View>
                              <View>
                                <Text style={styles.memberName}>{name}</Text>
                                <Text style={styles.memberRole}>{role}</Text>
                              </View>
                            </View>
                            <View style={[styles.statusBadge, badgeStyle]}>
                              <Text style={[
                                styles.badgeText,
                                m.status === 'checked_in' && styles.badgeTextActive,
                                m.status === 'checked_out' && styles.badgeTextCompleted,
                                m.status === 'joined' && styles.badgeTextJoined,
                              ]}>
                                {badgeText}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </GlassCard>
                );
              })}
            </View>
          );
        })()}

        {/* How it works */}
        <GlassCard intensity={5} style={styles.infoCardOuter} contentStyle={styles.infoCardInner}>
          <MaterialIcons name="info-outline" size={24} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Guide for Leaders</Text>
            <Text style={styles.infoDesc}>
              1. Add workers to your group{"\n"}
              2. Accept high-paying bulk jobs{"\n"}
              3. Manage attendance easily
            </Text>
          </View>
        </GlassCard>
      </ScrollView>

      <BottomNavBar role="leader" activeTab={activeTab === 'history' ? 'Bookings' : 'Home'} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  heroSection: {
    paddingTop: Platform.OS === 'ios' ? 48 : Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFF',
  },
  heroSubText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 6,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  mainActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 32,
    gap: 16,
  },
  primaryAction: {
    flex: 1.5,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
  },
  actionGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 12,
  },
  actionSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  secondaryAction: {
    flex: 1,
    height: 180,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    elevation: 4,
  },
  secondaryActionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  statsSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1C1E',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCardOuter: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statCardInner: {
    padding: 20,
  },
  statVal: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
  },
  statLab: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  infoCardOuter: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(31, 138, 61, 0.1)',
  },
  infoCardInner: {
    padding: 20,
    flexDirection: 'row',
    gap: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  infoDesc: {
    fontSize: 17,
    color: '#64748B',
    lineHeight: 24,
  },
  // Job alert banner
  jobAlertBanner: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  jobAlertGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  jobAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  jobAlertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  jobAlertText: { flex: 1 },
  jobAlertTitle: { fontSize: 15, fontWeight: '800', color: '#92400E' },
  jobAlertSub: { fontSize: 13, color: '#B45309', marginTop: 2 },
  jobAlertBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  jobAlertBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  // Offer badge
  offerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  offerBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  walletSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  walletCardOuter: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  walletCardInner: {
    padding: 24,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletTitleCol: {
    flex: 1,
  },
  walletLabelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  walletValueText: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 4,
  },
  walletIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  walletSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  walletSubCol: {
    flex: 1,
  },
  walletSubLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  walletSubValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
  },
  recentTxSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 20,
  },
  txListTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txWorkType: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  txStatus: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  attendanceSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  attendanceCardOuter: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    elevation: 4,
  },
  attendanceCardInner: {
    padding: 24,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  groupMetaCol: {
    flex: 1,
  },
  groupNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  groupTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  attendanceBadge: {
    backgroundColor: 'rgba(31, 138, 61, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  attendanceBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  membersListHeader: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 12,
  },
  membersListTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(31, 138, 61, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  badgeTextActive: {
    color: '#10B981',
    fontWeight: '900',
    fontSize: 11,
  },
  badgeInvited: {
    backgroundColor: '#F1F5F9',
  },
  badgeCompleted: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  badgeTextCompleted: {
    color: '#3B82F6',
    fontWeight: '900',
    fontSize: 11,
  },
  badgeJoined: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  badgeTextJoined: {
    color: '#F59E0B',
    fontWeight: '900',
    fontSize: 11,
  },
  badgeText: {
    color: '#64748B',
    fontWeight: '900',
    fontSize: 11,
  },
  noMembersText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
});

export default LeaderHomeScreen;
