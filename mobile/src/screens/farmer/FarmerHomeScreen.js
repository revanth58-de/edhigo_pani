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

const WorkTypeCard = ({ workType, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.workTypeWrapper}
      activeOpacity={0.7}
      onPress={() => onPress(workType.name)}
    >
      <GlassCard intensity={40} tint="light" style={styles.workTypeGlassCard}>
        <View style={styles.imageHeader}>
          <Image
            source={{ uri: workType.image }}
            style={styles.cardImage}
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
};

const FarmerHomeScreen = ({ navigation }) => {
  const { user, refreshProfile } = useAuthStore();
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';
  const [workers, setWorkers] = useState([]); // Real-time worker locations
  const [userLocation, setUserLocation] = useState(null);

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
        

        <View style={styles.headlineContainer}>
          <Text style={styles.headline}>{t('farmerHome.selectWorkType')}</Text>
        </View>

        <View style={styles.grid}>
          {workTypes.map((workType) => (
            <WorkTypeCard
              key={workType.id}
              workType={workType}
              onPress={handleWorkTypeSelect}
            />
          ))}
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
