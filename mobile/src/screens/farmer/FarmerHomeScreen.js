// Screen 6: Farmer Home - Exact match to farmer-home-work-type.html
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';
import MapDashboard from '../../components/MapDashboard';
import GlassCard from '../../components/GlassCard';
import { socketService } from '../../services/socketService';
import { Alert } from 'react-native';

const AnimatedCard = ({ workType, onPress }) => {
  // ... (keep existing AnimatedCard implementation intact, just change styling below)
  const hoverAnim = React.useRef(new Animated.Value(0)).current;

  const handleMouseEnter = () => {
    Animated.timing(hoverAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleMouseLeave = () => {
    Animated.timing(hoverAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const translateY = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0], // Safe offset
  });

  const scale = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const textColor = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0F172A', '#FFFFFF'],
  });

  return (
    <TouchableOpacity
      style={styles.workTypeWrapper}
      activeOpacity={0.9}
      onPress={() => onPress(workType.name)}
      onMouseEnter={Platform.OS === 'web' ? handleMouseEnter : undefined}
      onMouseLeave={Platform.OS === 'web' ? handleMouseLeave : undefined}
    >
      <GlassCard intensity={40} tint="light" style={styles.workTypeGlassCard}>
        <Animated.View
          style={[
            styles.hoverBackground,
            { transform: [{ translateY }] }
          ]}
        />
        <View style={styles.imageHeader}>
          <Animated.Image
            source={{ uri: workType.image }}
            style={[styles.cardImage, { transform: [{ scale }] }]}
          />
        </View>
        <View style={styles.cardContent}>
          <Animated.Text style={[styles.workTypeName, { color: textColor }]} numberOfLines={1}>
            {workType.name}
          </Animated.Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
};

const FarmerHomeScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';
  const [workers, setWorkers] = useState([]); // Real-time worker locations
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    socketService.connect();
    if (user?.id) {
      socketService.joinUserRoom(user.id);
    }

    const handleJobAccepted = (data) => {
      if (data.isFullyStaffed) {
        // All workers found — navigate to accepted screen
        Alert.alert(
          '🎉 All Workers Found!',
          `Your job is fully staffed.\n${data.workerName || 'Workers'} and others have joined.`,
          [
            { text: 'View Details', onPress: () => navigation.navigate('RequestAccepted', { job: { id: data.jobId, ...data } }) },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else {
        // Partial fill — just notify, don't navigate
        const acceptedCount = data.acceptedCount || 1;
        const needed = data.workersNeeded || '?';
        Alert.alert(
          `👷 Worker Joined (${acceptedCount}/${needed})`,
          `${data.workerName || 'A worker'} accepted your job.\nWaiting for ${needed - acceptedCount} more worker${needed - acceptedCount !== 1 ? 's' : ''}.`,
          [{ text: 'OK' }]
        );
      }
    };

    socketService.onJobAccepted(handleJobAccepted);

    const handleLocation = (data) => {
      setWorkers(prev => {
        const filtered = prev.filter(w => w.id !== data.userId);
        return [...filtered, {
          id: data.userId,
          latitude: data.latitude,
          longitude: data.longitude,
          type: 'worker',
          active: true
        }];
      });
    };

    socketService.onLocationUpdate(handleLocation);

    return () => {
      socketService.offJobAccepted(handleJobAccepted);
      socketService.offLocationUpdate(handleLocation);
    };
  }, [user?.id]);

  const handleWorkTypeSelect = (workType) => {
    navigation.navigate('SelectWorkers', { workType });
  };

  const workTypes = [
    {
      id: 'sowing',
      name: t('farmerHome.sowing'),
      image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'harvesting',
      name: t('farmerHome.harvesting'),
      image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'irrigation',
      name: t('farmerHome.irrigation'),
      image: 'https://images.unsplash.com/photo-1563200192-3580893cc071?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'labour',
      name: t('farmerHome.labour'),
      image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'tractor',
      name: t('farmerHome.tractor'),
      image: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=800&auto=format&fit=crop',
    },
  ];

  return (
    <LinearGradient 
      colors={['#FDFBF7', colors.backgroundLight]} 
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Spacer for translucent status bar */}
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      <TopBar title={t('farmerHome.selectWorkType')} navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {/* Dynamic Map Dashboard wrapped with styling for premium look */}
        <View style={styles.mapContainer}>
          <View style={styles.mapWrap}>
            <MapDashboard
              markers={workers}
              userLocation={userLocation}
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

        <View style={styles.headlineContainer}>
          <Text style={styles.headline}>{t('farmerHome.selectWorkType')}</Text>
        </View>

        <View style={styles.grid}>
          {workTypes.map((workType) => (
            <AnimatedCard
              key={workType.id}
              workType={workType}
              onPress={handleWorkTypeSelect}
            />
          ))}
        </View>
      </ScrollView>

      <BottomNavBar role="farmer" activeTab="Discovery" />
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
    top: 12,
    left: 12,
    zIndex: 10,
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
  headlineContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  greetingContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#131811',
  },
  greetingSubText: {
    fontSize: 14,
    color: '#6f8961',
    marginTop: 2,
  },

  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#131811',
    textAlign: 'center',
    marginBottom: 8,
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
    marginBottom: 12,
  },
  workTypeGlassCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    position: 'relative',
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
    height: 120,
    backgroundColor: '#F3F4F6',
    zIndex: 2,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 12,
    zIndex: 2,
  },
  workTypeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  workTypeDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});

export default FarmerHomeScreen;
