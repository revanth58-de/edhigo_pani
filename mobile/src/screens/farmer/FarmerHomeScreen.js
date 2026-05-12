// Screen 6: Farmer Home - Exact match to farmer-home-work-type.html
import React, { useEffect, useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';
import GlassCard from '../../components/GlassCard';
import { socketService } from '../../services/socketService';
import { Alert } from 'react-native';

const WorkTypeCard = ({ workType, onPress, index }) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      tension: 20,
      friction: 7,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, []);

  const animatedStyle = {
    opacity: animatedValue,
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.workTypeWrapper, animatedStyle]}>
      <TouchableOpacity
        style={styles.cardTouch}
        activeOpacity={0.9}
        onPress={() => onPress(workType.name)}
      >
        <GlassCard intensity={60} tint="light" style={styles.workTypeGlassCard}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: workType.image }}
              style={styles.cardImage}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)']}
              style={styles.imageOverlay}
            />
            <View style={styles.cardBadge}>
              <MaterialIcons name="arrow-forward" size={16} color="#FFF" />
            </View>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.workTypeName} numberOfLines={1}>
              {workType.name}
            </Text>
            <View style={styles.cardFooter}>
              <View style={styles.dot} />
              <Text style={styles.cardSubText}>Explore Nearby</Text>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
};

const FarmerHomeScreen = ({ navigation }) => {
  const { user, refreshProfile } = useAuthStore();
  const { t } = useTranslation();
  const [workersCount, setWorkersCount] = useState(12); // Mocked for now
  const [activeJobsCount, setActiveJobsCount] = useState(2); // Mocked for now

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  useEffect(() => {
    socketService.connect();
    if (user?.id) {
      socketService.joinUserRoom(user.id);
    }

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

    socketService.onJobAccepted(handleJobAccepted);

    return () => {
      socketService.offJobAccepted(handleJobAccepted);
    };
  }, [user?.id]);

  const handleWorkTypeSelect = (workType) => {
    navigation.navigate('LiveMapDiscovery', { workType });
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer} 
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Hero Section */}
        <LinearGradient 
          colors={['#1B4332', '#2D6A4F']} 
          style={styles.heroSection}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.greetingText}>
                {t('common.greeting') || 'Namaste'}, {user?.fullName?.split(' ')[0] || 'Farmer'}
              </Text>
              <Text style={styles.heroSubText}>Ready for today's harvest?</Text>
            </View>
            <TouchableOpacity style={styles.notificationBtn}>
              <MaterialIcons name="notifications-none" size={24} color="#FFF" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <GlassCard intensity={20} tint="light" style={styles.statCard}>
              <Text style={styles.statValue}>{workersCount}</Text>
              <Text style={styles.statLabel}>Workers Nearby</Text>
            </GlassCard>
            <GlassCard intensity={20} tint="light" style={styles.statCard}>
              <Text style={styles.statValue}>{activeJobsCount}</Text>
              <Text style={styles.statLabel}>Active Requests</Text>
            </GlassCard>
          </View>
        </LinearGradient>

        {/* Work Selection Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('farmerHome.selectWorkType')}</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {workTypes.map((workType, index) => (
            <WorkTypeCard
              key={workType.id}
              index={index}
              workType={workType}
              onPress={handleWorkTypeSelect}
            />
          ))}
        </View>
      </ScrollView>

      <BottomNavBar role="farmer" activeTab="Home" />
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
    marginBottom: 32,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  heroSubText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
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
    backgroundColor: '#FFD700',
    borderWidth: 2,
    borderColor: '#2D6A4F',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D6A4F',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 18,
    justifyContent: 'space-between',
  },
  workTypeWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  cardTouch: {
    width: '100%',
  },
  workTypeGlassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  cardBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(4px)',
  },
  cardContent: {
    padding: 16,
  },
  workTypeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2D6A4F',
  },
  cardSubText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
});

export default FarmerHomeScreen;
