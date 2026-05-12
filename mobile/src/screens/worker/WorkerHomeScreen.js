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
              <Text style={styles.greetingText}>
                {t('common.namaste') || 'Namaste'}, {user?.fullName?.split(' ')[0] || 'Worker'}
              </Text>
              <Text style={styles.heroSubText}>Ready to work today?</Text>
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

        {/* Weather & Location Widget */}
        <WeatherLocationHeader />

        <ScrollingBanner />

        {/* Main Action Area */}
        <View style={styles.mainActionArea}>
          <Text style={styles.actionTitle}>Find Nearby Work</Text>
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
                  {searching ? t('worker.searching') : t('worker.startWork')}
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
    paddingBottom: 60,
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
  mainActionArea: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
  actionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1C1E',
    marginBottom: 20,
  },
  startButton: {
    width: 240,
    height: 240,
    borderRadius: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: '#FFF',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  startBtnInner: {
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  startBtnTouchable: {
    borderRadius: 120,
  },
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
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 15,
    color: '#64748B',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1C1E',
    marginTop: 8,
  },
  statLab: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  quickLinks: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 32,
    justifyContent: 'space-between',
  },
  linkItem: {
    alignItems: 'center',
    gap: 8,
  },
  linkIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1E',
  },
});

export default WorkerHomeScreen;
