// Screen 17: Worker Home - Fixed and Refactored
import React, { useState, useEffect } from 'react';
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
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';
import MapDashboard from '../../components/MapDashboard';
import { jobAPI } from '../../services/api';

const WorkerHomeScreen = ({ navigation, route }) => {
  const { user, logout } = useAuthStore();
  const [isOnline, setIsOnline] = useState(true);
  const [searching, setSearching] = useState(false);
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';
  const [jobs, setJobs] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const activeTab = route.params?.tab || 'home';

  useEffect(() => {
    fetchNearbyJobs();
  }, []);

  const fetchNearbyJobs = async () => {
    try {
      const response = await jobAPI.getJobs({ status: 'pending' });
      const jobList = response?.data?.data || [];
      const markers = jobList.map(j => ({
        id: j.id,
        latitude: j.farmLatitude || 17.3850,
        longitude: j.farmLongitude || 78.4867,
        type: 'job',
        title: j.workType || 'Farm Job'
      }));
      setJobs(markers);
    } catch (e) {
      console.warn('Failed to fetch jobs for map');
    }
  };

  useEffect(() => {
    // Voice guidance removed
  }, []);

  const handleStartWork = async () => {
    setSearching(true);
    // Voice guidance removed
    try {
      const response = await jobAPI.getJobs({ status: 'pending' });
      const jobs = response?.data?.data || [];
      if (jobs.length === 0) {
        // Voice guidance removed
        Alert.alert('No Jobs', 'No pending jobs found near you. Please try again later.');
        return;
      }
      // Take the first available pending job
      const job = jobs[0];
      // Voice guidance removed
      navigation.navigate('JobOffer', { job });
    } catch (error) {
      console.error('Fetch jobs error:', error);
      Alert.alert('Error', 'Could not fetch jobs. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const toggleOnlineStatus = (value) => {
    setIsOnline(value);
    // Voice guidance removed
  };

  const handleHelp = () => {
    const phoneNumber = '+911800123456';
    if (Platform.OS === 'web') {
      window.alert('📞 Support: +91 1800-123-456');
    } else {
      Alert.alert(
        'Help / సహాయం',
        '📞 Support: +91 1800-123-456',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Bar */}
      <TopBar title={t('worker.workerHome')} navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Rapido-style Map for Workers */}
        <View style={styles.mapWrap}>
          <MapDashboard
            markers={jobs}
            userLocation={userLocation}
            height={280}
            onMarkerPress={(job) => navigation.navigate('JobOffer', { job })}
          />
          <View style={styles.mapOverlay}>
            <View style={[styles.onlineStatusBadge, { backgroundColor: isOnline ? colors.primary : '#9CA3AF' }]}>
              <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#fff' : '#666' }]} />
              <Text style={styles.onlineLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Text style={styles.greetingText}>
            {t('common.namaste')}, {user?.name || t('common.worker')}
          </Text>
          <Text style={styles.subText}>{t('worker.readyToEarn')}</Text>
        </View>

        <View style={{ height: 40 }} />

        {/* Massive START WORK Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.startButton, (!isOnline || searching) && { opacity: 0.7 }]}
            activeOpacity={0.9}
            onPress={handleStartWork}
            disabled={!isOnline || searching}
          >
            {searching ? (
              <>
                <ActivityIndicator color={colors.backgroundDark} size="large" />
                <Text
                  style={styles.startButtonText}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {t('worker.searching')}
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons name="play-arrow" size={72} color={colors.backgroundDark} />
                <Text
                  style={styles.startButtonText}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {t('worker.startWork')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionCard} onPress={handleHelp}>
            <View style={styles.actionIconCircle}>
              <MaterialIcons name="support-agent" size={30} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>{t('worker.help')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('QRScanner', { role: 'worker' })}
          >
            <View style={styles.actionIconCircle}>
              <MaterialIcons name="qr-code-scanner" size={30} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>{t('qr.scanQR')}</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            if (Platform.OS === 'web') {
              if (typeof window !== 'undefined' && window.confirm('Are you sure you want to logout?')) {
                logout();
              }
            } else {
              Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => logout(),
                  },
                ]
              );
            }
          }}
        >
          <MaterialIcons name="logout" size={22} color="#EF4444" />
          <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* History Overlay */}
      {activeTab === 'history' && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#fff', zIndex: 100 }]}>
          <TopBar title="Work History" showBack navigation={navigation} onHelp={() => navigation.setParams({ tab: 'home' })} />
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>Recent Jobs</Text>
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.primary, marginBottom: 12 }}>
                  <Text style={{ fontWeight: 'bold' }}>Harvesting - Feb {25 - i}, 2026</Text>
                  <Text style={{ color: '#64748B' }}>₹500 • Completed</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={{ padding: 16, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center', marginTop: 20 }}
              onPress={() => navigation.setParams({ tab: 'home' })}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close History</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Bottom Navigation */}
      <BottomNavBar role="worker" activeTab={activeTab === 'history' ? 'History' : 'Home'} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  mapWrap: {
    height: 280,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mapOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  onlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
  },
  profileHeader: {
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#131811',
    textAlign: 'center',
  },
  subText: {
    fontSize: 18,
    color: '#6f8961',
    marginTop: 4,
    textAlign: 'center',
  },
  voicePrompt: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 8,
    alignItems: 'center',
  },
  voicePromptInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  voicePromptText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131811',
  },
  voiceHint: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6f8961',
    letterSpacing: 2,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  startButton: {
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 8,
    borderColor: '#FFFFFF',
  },
  startButtonText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.backgroundDark,
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIconCircle: {
    backgroundColor: '#F2F4F0',
    padding: 16,
    borderRadius: 9999,
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131811',
  },
  logoutButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
  },
});

export default WorkerHomeScreen;
