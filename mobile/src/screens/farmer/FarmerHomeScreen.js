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
import * as Speech from 'expo-speech';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';
import MapDashboard from '../../components/MapDashboard';
import { socketService } from '../../services/socketService';

const AnimatedCard = ({ workType, onPress }) => {
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

  const subtextColor = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#64748B', '#162210'], // Darker green/black for contrast on bright primary
  });

  return (
    <TouchableOpacity
      style={styles.workTypeCard}
      activeOpacity={0.9}
      onPress={() => onPress(workType.name)}
      onMouseEnter={Platform.OS === 'web' ? handleMouseEnter : undefined}
      onMouseLeave={Platform.OS === 'web' ? handleMouseLeave : undefined}
    >
      {/* Absolute Background Animation */}
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
    </TouchableOpacity>
  );
};

const FarmerHomeScreen = ({ navigation }) => {
  const { user, isVoiceEnabled } = useAuthStore();
  const [workers, setWorkers] = useState([]); // Real-time worker locations
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (isVoiceEnabled) {
      Speech.speak('Pani select cheyyandi. Select work type', { language: 'te' });
    }

    // Connect to sockets for real-time tracking
    socketService.connect();

    // Listen for workers' location broadcasts
    socketService.onLocationUpdate((data) => {
      console.log('📍 Worker Location Update Received:', data);
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
    });

    // Mock initial workers if none detected (for demo/rapido feel)
    setTimeout(() => {
      setWorkers([
        { id: 'mock-1', latitude: 17.3850, longitude: 78.4867, type: 'worker', active: true },
        { id: 'mock-2', latitude: 17.3900, longitude: 78.4900, type: 'worker', active: true },
      ]);
    }, 1000);

    return () => {
      // Clean up socket listeners if needed
    };
  }, [isVoiceEnabled]);

  const handleWorkTypeSelect = (workType) => {
    if (isVoiceEnabled) {
      Speech.speak(`${workType} selected`, { language: 'en' });
    }
    navigation.navigate('SelectWorkers', { workType });
  };

  const workTypes = [
    {
      id: 'sowing',
      name: 'Sowing',
      image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=800&auto=format&fit=crop',
      color: '#FFA500',
      bgColor: '#FFF5E6',
      description: ''
    },
    {
      id: 'harvesting',
      name: 'Harvesting',
      image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop',
      color: '#FFD700',
      bgColor: '#FFFBF0',
      description: ''
    },
    {
      id: 'irrigation',
      name: 'Irrigation',
      image: 'https://images.unsplash.com/photo-1563200192-3580893cc071?q=80&w=800&auto=format&fit=crop',
      color: '#4A90E2',
      bgColor: '#E3F2FD',
      description: ''
    },
    {
      id: 'labour',
      name: 'Labour',
      image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?q=80&w=800&auto=format&fit=crop',
      color: '#EF4444',
      bgColor: '#FEE2E2',
      description: ''
    },
    {
      id: 'tractor',
      name: 'Tractor',
      image: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=800&auto=format&fit=crop',
      color: '#10B981',
      bgColor: '#D1FAE5',
      description: ''
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top App Bar with Help icon */}
      <TopBar title="Farmer Home" navigation={navigation} />

      {/* Main Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Rapido-style Map Dashboard */}
        <View style={styles.mapWrap}>
          <MapDashboard
            markers={workers}
            userLocation={userLocation}
            height={320}
            onMarkerPress={(m) => console.log('Marker pressed:', m)}
          />
          <View style={styles.mapOverlay}>
            <View style={styles.activeBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.activeLabel}>{workers.length} Workers Online</Text>
            </View>
          </View>
        </View>


        {/* Headline */}
        <View style={styles.headlineContainer}>
          <Text style={styles.headline}>Select Work Type</Text>
          <View style={styles.voiceBadge}>
            <MaterialIcons name="record-voice-over" size={20} color={colors.primary} />
            <Text style={styles.voiceBadgeText}>Pani select cheyyandi</Text>
          </View>
        </View>

        {/* Work Type Grid */}
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

      {/* Bottom Navigation */}
      <BottomNavBar role="farmer" activeTab="Home" />
    </View>
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
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${colors.primary}1A`,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },
  voiceBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6f8961',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  workTypeCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
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
