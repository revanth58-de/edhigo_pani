// Screen 6: Farmer Home — M2: Skeleton shimmer loaders during initial profile/data load
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  Animated,
  Platform,
  RefreshControl,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';
import GlassCard from '../../components/GlassCard';
import MapDashboard from '../../components/MapDashboard';
import WeatherLocationHeader from '../../components/WeatherLocationHeader';
import { WebView } from 'react-native-webview';
import { socketService } from '../../services/socketService';
import { Alert } from 'react-native';

// ── M2: Shimmer skeleton for a single work-type card ─────────────────────────
const SkeletonCard = ({ shimmer }) => {
  // shimmer is a shared Animated.Value (0→1) driven by a looping animation
  const translateX = shimmer.interpolate({
    inputRange:  [0, 1],
    outputRange: ['-100%', '100%'],
  });

  return (
    <View style={styles.workTypeWrapper}>
      <View style={[styles.skeletonCard, { overflow: 'hidden' }]}>
        {/* Image placeholder */}
        <View style={styles.skeletonImage}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              styles.shimmerOverlay,
              { transform: [{ translateX }] },
            ]}
          />
        </View>
        {/* Text placeholder */}
        <View style={styles.skeletonTextRow}>
          <View style={[styles.skeletonText, { overflow: 'hidden' }]}>
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                styles.shimmerOverlay,
                { transform: [{ translateX }] },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

// ── Work-type card (real content) ─────────────────────────────────────────────
const WorkTypeCard = ({ workType, onPress }) => (
  <TouchableOpacity
    style={styles.workTypeWrapper}
    activeOpacity={0.8}
    onPress={() => onPress(workType)}
  >
    <GlassCard intensity={40} tint="light" style={styles.workTypeGlassCard}>
      <View style={styles.imageHeader}>
        <Image source={{ uri: workType.image }} style={styles.cardImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.4)']}
          style={styles.cardGradient}
        />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.workTypeName} numberOfLines={1}>
          {workType.name}
        </Text>
      </View>
    </GlassCard>
  </TouchableOpacity>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const FarmerHomeScreen = ({ navigation }) => {
  const { user, refreshProfile } = useAuthStore();
  const { t } = useTranslation();
  const [workers, setWorkers]         = useState([]);
  const [loading, setLoading]         = useState(true);    // M2: drives skeleton
  const [refreshing, setRefreshing]   = useState(false);

  // M2: single shared shimmer Animated.Value for all skeleton cards
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Run the shimmer loop whenever skeleton is visible
  useEffect(() => {
    if (!loading) return;
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [loading, shimmerAnim]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      await refreshProfile();
    } catch (_) {
      // profile load error is non-fatal
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshProfile]);

  useFocusEffect(
    useCallback(() => { loadData(); }, [loadData])
  );

  useEffect(() => {
    socketService.connect();
    if (user?.id) socketService.joinUserRoom(user.id);

    const handleJobAccepted = (data) => {
      if (data.isFullyStaffed) {
        Alert.alert(
          '🎉 All Workers Found!',
          `Your job is fully staffed.\n${data.workerName || 'Workers'} and others have joined.`,
          [
            { text: 'View Details', onPress: () => navigation.navigate('RequestAccepted', { job: { id: data.jobId, ...data } }) },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else {
        const acceptedCount = data.acceptedCount || 1;
        const needed = data.workersNeeded || '?';
        Alert.alert(
          `👷 Worker Joined (${acceptedCount}/${needed})`,
          `${data.workerName || 'A worker'} accepted your job.\nWaiting for ${needed - acceptedCount} more worker${needed - acceptedCount !== 1 ? 's' : ''}.`,
          [{ text: 'OK' }]
        );
      }
    };

    const handleLocation = (data) => {
      setWorkers(prev => {
        const filtered = prev.filter(w => w.id !== data.userId);
        return [...filtered, { id: data.userId, latitude: data.latitude, longitude: data.longitude, type: 'worker', active: true }];
      });
    };

    socketService.onJobAccepted(handleJobAccepted);
    socketService.onLocationUpdate(handleLocation);
    return () => {
      socketService.offJobAccepted(handleJobAccepted);
      socketService.offLocationUpdate(handleLocation);
    };
  }, [user?.id]);

  const handleWorkTypeSelect = (wType) => {
    if (wType.id === 'tractor' || wType.id === 'harvester') {
      navigation.navigate('MachineryBooking', { machineType: wType.id === 'tractor' ? 'Tractor' : 'Harvester' });
    } else {
      navigation.navigate('LiveMapDiscovery', { workType: wType.name });
    }
  };

  const workTypes = [
    {
      id: 'sowing',
      name: t('farmerHome.sowing') || 'Sowing',
      image: 'https://images.pexels.com/photos/2132227/pexels-photo-2132227.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: 'harvesting',
      name: t('farmerHome.harvesting') || 'Harvesting',
      image: 'https://images.pexels.com/photos/259280/pexels-photo-259280.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: 'irrigation',
      name: t('farmerHome.irrigation') || 'Irrigation',
      image: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=800',
    },
    {
      id: 'labour',
      name: t('farmerHome.labour') || 'General Labour',
      image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?q=80&w=800',
    },
    {
      id: 'tractor',
      name: t('farmerHome.tractor') || 'Tractor',
      image: 'https://images.pexels.com/photos/1595108/pexels-photo-1595108.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: 'harvester',
      name: 'Harvester Machine',
      image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=800',
    },
    {
      id: 'pesticide',
      name: 'Pesticide Spraying',
      image: 'https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: 'ploughing',
      name: 'Ploughing',
      image: 'https://images.pexels.com/photos/2886937/pexels-photo-2886937.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
  ];

  return (
    <LinearGradient colors={['#FDFBF7', colors.backgroundLight]} style={styles.container}>
      <TopBar title="DINASARI" showLogo={true} navigation={navigation} />
      <WeatherLocationHeader />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Modern Welcome Header */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            {t('common.namaste') || 'Namaste'}, {user?.name || 'Farmer'} 👋
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Find the best local workers & modern machinery for your farm today.
          </Text>
        </View>
        {/* Dynamic Map Dashboard wrapped with styling for premium look */}
        <View style={styles.mapContainer}>
          <View style={styles.mapWrap}>
            <MapDashboard
              markers={workers}
              height={320}
              onMarkerPress={(m) => console.log('Marker pressed:', m)}
            />
          </View>
          
          <View style={styles.mapOverlay}>
            <GlassCard intensity={80} tint="light" style={styles.glassBadge} noShadow>
              <View style={styles.activeBadge}>
                <View style={[styles.pulseDot, workers.length === 0 && { backgroundColor: colors.warning }]} />
                <Text style={styles.activeLabel}>
                  {workers.length} {workers.length === 1 ? 'Worker' : 'Workers'} Online
                </Text>
              </View>
            </GlassCard>
          </View>
        </View>
        <View style={styles.sectionHeaderContainer}>
          {/* M2: Show a skeleton text placeholder during load */}
          {loading ? (
            <View style={[styles.skeletonHeadline, { overflow: 'hidden' }]}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  styles.shimmerOverlay,
                  { transform: [{ translateX: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: ['-100%', '100%'] }) }] },
                ]}
              />
            </View>
          ) : (
            <View>
              <Text style={styles.sectionHeadline}>Quick Hire Services</Text>
              <Text style={styles.sectionSubline}>Choose a category to discover and book nearby workforce instantly</Text>
            </View>
          )}
        </View>

        {/* M2: Show 6 skeleton cards while loading, then real cards */}
        <View style={styles.grid}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} shimmer={shimmerAnim} />
              ))
            : workTypes.map((workType) => (
                <WorkTypeCard key={workType.id} workType={workType} onPress={handleWorkTypeSelect} />
              ))
          }
        </View>

        {/* How to use the app */}
        <View style={styles.videoSection}>
          <Text style={styles.sectionTitle}>How to use DINASARI?</Text>
          <View style={styles.videoContainer}>
            <WebView
              style={{ flex: 1 }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              source={{ uri: 'https://www.youtube.com/embed/zH3vH3yJtM0' }}
            />
          </View>
        </View>
      </ScrollView>

      <BottomNavBar role="farmer" activeTab="Home" />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  videoSection: {
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#131811',
    marginBottom: 12,
  },
  videoContainer: {
    height: 200,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
    }),
  },
  mapContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  mapWrap: {
    height: 320,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }
    }),
  },
  mapOverlay: {
    position: 'absolute',
    top: 28,
    left: 28,
    zIndex: 10,
  },
  glassBadge: {
    borderRadius: 9999,
    padding: 2,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
    }),
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#131811',
  },

  welcomeContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 4,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
    lineHeight: 20,
  },
  sectionHeaderContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeadline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  sectionSubline: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
    lineHeight: 18,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  workTypeWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  workTypeGlassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 6px 16px rgba(0,0,0,0.04)',
      }
    }),
  },
  hoverBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    backgroundColor: colors.primary, // App primary green
  },
  imageHeader: {
    width: '100%',
    height: 125,
    backgroundColor: '#F1F5F9',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  workTypeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },

  // ── M2: Skeleton styles ──────────────────────────────────────────────────
  skeletonCard: {
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skeletonImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#E5E7EB',
  },
  skeletonTextRow: {
    padding: 12,
    alignItems: 'center',
  },
  skeletonText: {
    height: 18,
    width: '70%',
    borderRadius: 9,
    backgroundColor: '#E5E7EB',
  },
  skeletonHeadline: {
    height: 32,
    width: 220,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  // Shimmer highlight that slides across skeleton elements
  shimmerOverlay: {
    width: '60%',
    backgroundColor: 'rgba(255,255,255,0.65)',
    transform: [{ skewX: '-20deg' }],
  },

  // Legacy styles kept for compatibility
  greetingContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  greetingText:      { fontSize: 22, fontWeight: '800', color: '#131811' },
  greetingSubText:   { fontSize: 14, color: '#6f8961', marginTop: 2 },
  workTypeDescription: { fontSize: 12, color: '#64748B', lineHeight: 16 },
});

export default FarmerHomeScreen;
