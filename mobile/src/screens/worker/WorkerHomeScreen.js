import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import BottomNavBar from '../../components/BottomNavBar';
import ScrollingBanner from '../../components/ScrollingBanner';
import WeatherLocationHeader from '../../components/WeatherLocationHeader';
import FloatingGroupIcon from '../../components/FloatingGroupIcon';
import GlassCard from '../../components/GlassCard';
import { jobAPI } from '../../services/api';
import { socketService } from '../../services/socketService';

const WorkerHomeScreen = ({ navigation, route }) => {
  const { user, refreshProfile, logout } = useAuthStore();
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(true);
  const [searching, setSearching] = useState(false);
  const activeTab = route.params?.tab || 'home';
  
  const scrollY = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  useEffect(() => {
    if (user?.id) {
      socketService.connect();
      socketService.joinUserRoom(user.id);
    }
  }, [user?.id]);

  const handleStartWork = async () => {
    setSearching(true);
    try {
      const response = await jobAPI.getJobs({ status: 'pending' });
      const jobs = response?.data?.data || [];
      if (jobs.length === 0) {
        Alert.alert('No Jobs', 'No pending jobs found near you. Please try again later.');
        return;
      }
      navigation.navigate('JobOffer', { job: jobs[0] });
    } catch (error) {
      Alert.alert('Error', 'Could not fetch jobs. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleHelp = () => {
    Alert.alert('Support', 'Contacting support at +91 1800-123-456');
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <Animated.ScrollView 
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Hero Section */}
        <LinearGradient 
          colors={[colors.primary, colors.primaryDark]} 
          style={styles.heroSection}
        >
          <Animated.View style={[styles.heroTopRow, { opacity: headerOpacity }]}>
            <View>
              <Text style={styles.greetingText}>Dinasari</Text>
              <View style={styles.badgeRow}>
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={14} color={colors.accent} />
                  <Text style={styles.badgeText}>Verified Expert</Text>
                </View>
                <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <MaterialIcons name="star" size={14} color={colors.accent} />
                  <Text style={styles.badgeText}>Top Rated</Text>
                </View>
              </View>
              <Text style={styles.heroSubText}>Ready to work, {user?.fullName?.split(' ')[0] || 'Worker'}?</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <MaterialIcons name="notifications-none" size={24} color="#FFF" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>

        {/* Earnings Analytics Widget */}
        <View style={styles.earningsWrapper}>
          <GlassCard intensity={20} style={styles.earningsCard}>
            <View style={styles.earningsHeader}>
              <View>
                <Text style={styles.earningsLabel}>Daily Earnings</Text>
                <Text style={styles.earningsValue}>₹350 <Text style={styles.goalText}>/ ₹500</Text></Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPct}>70%</Text>
              </View>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '70%' }]} />
            </View>
            <Text style={styles.earningsNote}>₹150 more to reach your daily goal!</Text>
          </GlassCard>
        </View>

        {/* Weather & Location Widget */}
        <WeatherLocationHeader />

        <ScrollingBanner />

        {/* Nearby Jobs Preview */}
        <View style={styles.jobsPreviewSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Opportunities</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>View Map</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jobsScroll}>
            <GlassCard intensity={10} style={styles.jobPreviewCard}>
              <View style={styles.jobTypeIcon}>
                <MaterialIcons name="grass" size={24} color={colors.primary} />
              </View>
              <Text style={styles.jobName}>Sowing</Text>
              <Text style={styles.jobDist}>1.2 km away</Text>
              <Text style={styles.jobPay}>₹450/day</Text>
            </GlassCard>
            <GlassCard intensity={10} style={styles.jobPreviewCard}>
              <View style={[styles.jobTypeIcon, { backgroundColor: '#FFF7ED' }]}>
                <MaterialIcons name="agriculture" size={24} color="#F97316" />
              </View>
              <Text style={styles.jobName}>Harvesting</Text>
              <Text style={styles.jobDist}>2.5 km away</Text>
              <Text style={styles.jobPay}>₹550/day</Text>
            </GlassCard>
            <GlassCard intensity={10} style={styles.jobPreviewCard}>
              <View style={[styles.jobTypeIcon, { backgroundColor: '#EFF6FF' }]}>
                <MaterialIcons name="water_drop" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.jobName}>Irrigation</Text>
              <Text style={styles.jobDist}>0.8 km away</Text>
              <Text style={styles.jobPay}>₹400/day</Text>
            </GlassCard>
          </ScrollView>
        </View>

        {/* Main Action Area */}
        <View style={styles.mainActionArea}>
          <Text style={styles.actionTitle}>Instant Hire Mode</Text>
          <TouchableOpacity
            style={[styles.startBtnTouchable, (!isOnline || searching) && { opacity: 0.8 }]}
            activeOpacity={0.9}
            onPress={handleStartWork}
            disabled={!isOnline || searching}
          >
            <LinearGradient
               colors={isOnline && !searching ? colors.primaryGradient : ['#9CA3AF', '#6B7280']}
               style={styles.startButton}
            >
              <View style={styles.startBtnInner}>
                {searching ? (
                  <ActivityIndicator color="#FFF" size="large" />
                ) : (
                  <MaterialIcons name="play-arrow" size={80} color="#FFF" />
                )}
                <Text style={styles.startButtonText}>
                  {searching ? t('worker.searching') : 'Go Online'}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <GlassCard intensity={10} style={styles.statBox}>
            <MaterialIcons name="event-available" size={24} color={colors.primary} />
            <Text style={styles.statVal}>Available</Text>
            <Text style={styles.statLab}>Status</Text>
          </GlassCard>
          <GlassCard intensity={10} style={styles.statBox}>
            <MaterialIcons name="star" size={24} color={colors.accent} />
            <Text style={styles.statVal}>4.8</Text>
            <Text style={styles.statLab}>Rating</Text>
          </GlassCard>
          <GlassCard intensity={10} style={styles.statBox}>
            <MaterialIcons name="history" size={24} color={colors.secondary} />
            <Text style={styles.statVal}>12</Text>
            <Text style={styles.statLab}>Jobs</Text>
          </GlassCard>
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.linkItem} onPress={() => navigation.navigate('QRScanner')}>
            <View style={[styles.linkIcon, { backgroundColor: '#E9F5ED' }]}>
              <MaterialIcons name="qr-code-scanner" size={28} color={colors.primary} />
            </View>
            <Text style={styles.linkText}>Scan QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem} onPress={handleHelp}>
            <View style={[styles.linkIcon, { backgroundColor: '#FDF8E1' }]}>
              <MaterialIcons name="support-agent" size={28} color={colors.accent} />
            </View>
            <Text style={styles.linkText}>Help</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem} onPress={() => logout()}>
            <View style={[styles.linkIcon, { backgroundColor: '#FEF2F2' }]}>
              <MaterialIcons name="logout" size={28} color="#EF4444" />
            </View>
            <Text style={styles.linkText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* Floating Group Button */}
      <FloatingGroupIcon />

      <BottomNavBar role="worker" activeTab={activeTab === 'history' ? 'Bookings' : 'Home'} />
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
    paddingBottom: 140,
  },
  heroSection: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
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
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  heroSubText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginTop: 8,
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

  // Earnings
  earningsWrapper: {
    marginTop: -24,
    paddingHorizontal: 24,
  },
  earningsCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  earningsValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 4,
  },
  goalText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  progressCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: colors.primaryMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPct: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  earningsNote: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 12,
  },

  // Jobs Preview
  jobsPreviewSection: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  jobsScroll: {
    paddingHorizontal: 24,
    gap: 16,
    paddingBottom: 8,
  },
  jobPreviewCard: {
    width: 160,
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  jobTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  jobDist: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  jobPay: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 8,
  },

  // Main Action Area
  mainActionArea: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
  actionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1C1E',
    marginBottom: 20,
  },
  startButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#FFF',
    elevation: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  startBtnInner: {
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  startBtnTouchable: {
    borderRadius: 110,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 32,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#FFF',
    elevation: 4,
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A1C1E',
    marginTop: 8,
  },
  statLab: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Quick Links
  quickLinks: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 40,
    justifyContent: 'space-between',
  },
  linkItem: {
    alignItems: 'center',
    gap: 10,
  },
  linkIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1C1E',
  },
});

export default WorkerHomeScreen;
