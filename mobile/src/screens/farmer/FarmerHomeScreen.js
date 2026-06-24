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
const CropCard = ({ crop, onPress }) => (
  <TouchableOpacity
    style={styles.workTypeWrapper}
    activeOpacity={0.8}
    onPress={() => onPress(crop)}
  >
    <GlassCard intensity={40} tint="light" style={styles.workTypeGlassCard}>
      <View style={styles.imageHeader}>
        <Image source={{ uri: crop.image }} style={styles.cardImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.4)']}
          style={styles.cardGradient}
        />
        <View style={[styles.cropIconBadge, { backgroundColor: crop.gradient[0] }]}>
          <MaterialIcons name={crop.icon} size={20} color="#FFF" />
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.workTypeName} numberOfLines={1}>
          {crop.name}
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

  const [machineryList, setMachineryList] = useState([
    {
      id: 'tractor',
      name: 'Tractor Rentals',
      type: 'Tractor',
      price: '₹800/hr',
      image: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=800&auto=format&fit=crop',
      owner: 'Ramesh Kumar',
    },
    {
      id: 'harvester',
      name: 'Combine Harvester',
      type: 'Harvester',
      price: '₹1,800/hr',
      image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=800&auto=format&fit=crop',
      owner: 'Suresh Singh',
    },
    {
      id: 'drone',
      name: 'Pesticide Drone',
      type: 'Sprayer',
      price: '₹1,200/hr',
      image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800&auto=format&fit=crop',
      owner: 'Venkatesh Rao',
    },
    {
      id: 'rotavator',
      name: 'Power Rotavator',
      type: 'Plough',
      price: '₹600/hr',
      image: 'https://images.unsplash.com/photo-1592882199738-9271a5c68b75?q=80&w=800&auto=format&fit=crop',
      owner: 'Anil Reddy',
    },
  ]);

  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddMachinery = () => {
    setShowAddMenu(false);
    Alert.alert(
      '🚜 List Farm Machinery',
      'Select a machinery item to add to your rental listing:',
      [
        {
          text: 'Tractor (₹800/hr)',
          onPress: () => appendMachinery('Tractor', 'Tractor', '₹800/hr', 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=800'),
        },
        {
          text: 'Pesticide Drone (₹1,200/hr)',
          onPress: () => appendMachinery('Pesticide Drone', 'Sprayer', '₹1,200/hr', 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800'),
        },
        {
          text: 'Rotavator (₹600/hr)',
          onPress: () => appendMachinery('Rotavator', 'Plough', '₹600/hr', 'https://images.unsplash.com/photo-1592882199738-9271a5c68b75?q=80&w=800'),
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const appendMachinery = (name, type, price, image) => {
    const newItem = {
      id: `custom_${Date.now()}`,
      name: `${name} (My Listing)`,
      type: type,
      price: price,
      image: image,
      owner: user?.name || 'My Farm',
    };
    setMachineryList(prev => [newItem, ...prev]);
    Alert.alert('🎉 Success!', `${name} has been successfully added to your dashboard machinery listing!`);
  };

  const handleDeleteMachinery = (id) => {
    Alert.alert(
      '🗑️ Remove Listing',
      'Are you sure you want to remove this machinery listing from your dashboard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setMachineryList(prev => prev.filter(item => item.id !== id));
          }
        }
      ]
    );
  };

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

  const handleCropSelect = (crop) => {
    navigation.navigate('CropWorkTypes', { cropId: crop.id, cropName: crop.name, cropGradient: crop.gradient });
  };

  const crops = [
    {
      id: 'paddy',
      name: t('crops.paddy') || 'Paddy (Rice)',
      image: 'https://images.pexels.com/photos/259280/pexels-photo-259280.jpeg?auto=compress&cs=tinysrgb&w=800',
      gradient: ['#10B981', '#059669'], // Green themed
      icon: 'grain',
    },
    {
      id: 'chilli',
      name: t('crops.chilli') || 'Chilli',
      image: 'https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=800',
      gradient: ['#EF4444', '#DC2626'], // Red themed
      icon: 'local-fire-department',
    },
    {
      id: 'mango',
      name: t('crops.mango') || 'Mango',
      image: 'https://images.pexels.com/photos/2290740/pexels-photo-2290740.jpeg?auto=compress&cs=tinysrgb&w=800',
      gradient: ['#F59E0B', '#D97706'], // Amber themed
      icon: 'eco',
    },
    {
      id: 'banana',
      name: t('crops.banana') || 'Banana',
      image: 'https://images.pexels.com/photos/2872755/pexels-photo-2872755.jpeg?auto=compress&cs=tinysrgb&w=800',
      gradient: ['#FBBF24', '#F59E0B'], // Yellow/Orange
      icon: 'spa',
    },
    {
      id: 'groundnut',
      name: t('crops.groundnut') || 'Groundnut',
      image: 'https://images.pexels.com/photos/5928014/pexels-photo-5928014.jpeg?auto=compress&cs=tinysrgb&w=800',
      gradient: ['#8B5CF6', '#7C3AED'], // Violet themed
      icon: 'grass',
    },
  ];



  return (
    <LinearGradient colors={['#FDFBF7', colors.backgroundLight]} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

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
            ? Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} shimmer={shimmerAnim} />
              ))
            : crops.map((crop) => (
                <CropCard key={crop.id} crop={crop} onPress={handleCropSelect} />
              ))
          }
        </View>

        {/* Modern Machinery Section */}
        <View style={styles.machinerySection}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeadline}>Modern Farm Machinery</Text>
            <Text style={styles.sectionSubline}>Rent high-performance, professional machinery instantly</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.machineryScroll}
          >
            {machineryList.map((item) => (
              <GlassCard intensity={30} tint="light" key={item.id} style={styles.machineryCard}>
                <Image source={{ uri: item.image }} style={styles.machineryImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0, 0, 0, 0.6)']}
                  style={styles.machineryGradient}
                />
                {item.id.toString().startsWith('custom_') && (
                  <TouchableOpacity
                    style={styles.deleteListingBadge}
                    onPress={() => handleDeleteMachinery(item.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="delete" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
                <View style={styles.machineryBadge}>
                  <Text style={styles.machineryBadgeText}>{item.price}</Text>
                </View>
                <View style={styles.machineryInfo}>
                  <Text style={styles.machineryName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.machineryOwner} numberOfLines={1}>Owner: {item.owner}</Text>
                  <TouchableOpacity
                    style={styles.machineryBookBtn}
                    onPress={() => navigation.navigate('MachineryBooking', { machineType: item.type || item.name })}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={colors.primaryGradient || ['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.machineryBookBtnGrad}
                    >
                      <Text style={styles.machineryBookText}>Book Now</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}
          </ScrollView>
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

      {/* Floating Action Button (FAB) for Post Job / Add Machinery */}
      <View style={styles.fabContainer}>
        {showAddMenu && (
          <View style={styles.fabMenu}>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setShowAddMenu(false);
                navigation.navigate('WorkCategories');
              }}
            >
              <Text style={styles.fabMenuText}>🌾 Post a Job</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={handleAddMachinery}
            >
              <Text style={styles.fabMenuText}>🚜 Add Machinery</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => setShowAddMenu(!showAddMenu)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={colors.primaryGradient || ['#10B981', '#059669']}
            style={styles.fabGradient}
          >
            <MaterialIcons name={showAddMenu ? "close" : "add"} size={32} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    paddingTop: 16,
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
  machinerySection: {
    marginTop: 8,
    marginBottom: 12,
  },
  machineryScroll: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 16,
  },
  machineryCard: {
    width: 220,
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
  machineryImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  machineryGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 80,
    height: 40,
  },
  machineryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.accent || '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  deleteListingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  machineryBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  machineryInfo: {
    padding: 12,
  },
  machineryName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  machineryOwner: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  machineryBookBtn: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  machineryBookBtnGrad: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  machineryBookText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
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

  // FAB Styles
  fabContainer: {
    position: 'absolute',
    bottom: 96,
    right: 24,
    alignItems: 'flex-end',
    zIndex: 999,
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
      }
    }),
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabMenu: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  fabMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
  },
  fabMenuText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },

  // Legacy styles kept for compatibility
  greetingContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  greetingText:      { fontSize: 22, fontWeight: '800', color: '#131811' },
  greetingSubText:   { fontSize: 14, color: '#6f8961', marginTop: 2 },
  workTypeDescription: { fontSize: 12, color: '#64748B', lineHeight: 16 },
  cropIconBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
});

export default FarmerHomeScreen;
