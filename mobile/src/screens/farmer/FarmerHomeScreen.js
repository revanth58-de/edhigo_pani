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
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import BottomNavBar from '../../components/BottomNavBar';
import GlassCard from '../../components/GlassCard';
import WeatherLocationHeader from '../../components/WeatherLocationHeader';
import { socketService } from '../../services/socketService';

const WorkTypeCard = ({ workType, onPress, index }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

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
        <GlassCard intensity={40} tint="light" style={styles.workTypeGlassCard}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: workType.image }} style={styles.cardImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageOverlay}
            />
            <View style={styles.cardBadge}>
              <MaterialIcons name="chevron-right" size={24} color="#FFF" />
            </View>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.workTypeName} numberOfLines={1}>{workType.name}</Text>
            <View style={styles.cardFooter}>
              <View style={styles.dot} />
              <Text style={styles.cardSubText}>Find Workers</Text>
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
  const [search, setSearch] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleVoiceSearch = () => {
    setIsListening(true);
    // Simulate listening for 2 seconds
    setTimeout(() => {
      setIsListening(false);
      const heardText = "Harvesting"; // Mocked speech-to-text result
      setSearch(heardText);
      
      // Auto-navigate if exact match found
      const match = workTypes.find(wt => wt.name.toLowerCase() === heardText.toLowerCase());
      if (match) {
        Alert.alert(
          "🎙️ Voice Search",
          `I heard "${heardText}". Taking you there...`,
          [{ text: "OK", onPress: () => handleWorkTypeSelect(match) }]
        );
      } else {
        Alert.alert(
          "🎙️ Voice Search",
          `I heard "${heardText}". Filtering list...`
        );
      }
    }, 2000);
  };

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

  const handleWorkTypeSelect = (workType) => {
    navigation.navigate('LiveMapDiscovery', { workType });
  };

  const workTypes = [
    { id: 'sowing', name: t('farmerHome.sowing'), image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=800&auto=format&fit=crop' },
    { id: 'harvesting', name: t('farmerHome.harvesting'), image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop' },
    { id: 'drone', name: 'Drone Service', image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800&auto=format&fit=crop' },
    { id: 'drivers', name: 'Drivers/Operators', image: 'https://images.unsplash.com/photo-1591768793355-74d7acd51bd2?q=80&w=800&auto=format&fit=crop' },
    { id: 'irrigation', name: t('farmerHome.irrigation'), image: 'https://images.unsplash.com/photo-1563200192-3580893cc071?q=80&w=800&auto=format&fit=crop' },
    { id: 'tractor', name: t('farmerHome.tractor'), image: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=800&auto=format&fit=crop' },
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
          colors={[colors.primary, colors.primaryDark]} 
          style={styles.heroSection}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.greetingText}>
                {t('common.namaste') || 'Namaste'}, {user?.fullName?.split(' ')[0] || 'Farmer'}
              </Text>
              <Text style={styles.heroSubText}>What are we planting today?</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <MaterialIcons name="notifications-none" size={24} color="#FFF" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          {/* Search & Voice Search UI */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={20} color="#94A3B8" />
              <TextInput
                placeholder="Search for workers or services..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
              <TouchableOpacity 
                style={styles.micButton} 
                onPress={handleVoiceSearch}
                activeOpacity={0.7}
              >
                <MaterialIcons 
                  name="mic" 
                  size={24} 
                  color={isListening ? colors.secondary : colors.primary} 
                />
                {isListening && <View style={styles.micPulse} />}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <WeatherLocationHeader />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('farmerHome.selectWorkType')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WorkCategories')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {workTypes
            .filter(wt => wt.name.toLowerCase().includes(search.toLowerCase()))
            .map((workType, index) => (
              <WorkTypeCard
                key={workType.id}
                index={index}
                workType={workType}
                onPress={handleWorkTypeSelect}
              />
            ))}
        </View>

        {/* Video Section */}
        <View style={styles.videoSection}>
          <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
            <Text style={styles.sectionTitle}>Edhigo Pani in Action</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Watch Tutorial</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardSubText, { marginLeft: 24, marginBottom: 16 }]}>See how Edhigo Pani is transforming Indian agriculture</Text>
          
          <GlassCard intensity={20} style={styles.videoCard}>
            <View style={styles.videoWrapper}>
              <WebView
                source={{ uri: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }} // Placeholder tutorial video
                style={styles.webView}
                allowsFullscreenVideo
              />
            </View>
            <View style={styles.videoFooter}>
              <Text style={styles.videoTag}>TUTORIAL</Text>
              <Text style={styles.videoTitle}>How to hire skilled workers in 2 minutes</Text>
            </View>
          </GlassCard>
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
    paddingBottom: 80,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    // Removed borderWidth to avoid "another box" feel
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: '#1E293B',
    fontWeight: '500',
    paddingVertical: 0, // Prevent Android default padding
    marginLeft: 8,
  },
  micButton: {
    padding: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.secondary,
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },
  seeAllText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
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
    elevation: 4,
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
    height: 70,
  },
  cardBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
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
    backgroundColor: colors.primary,
  },
  cardSubText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  videoSection: {
    marginTop: 24,
    paddingBottom: 24,
  },
  videoCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    elevation: 4,
  },
  videoWrapper: {
    width: '100%',
    height: 200,
  },
  webView: {
    flex: 1,
  },
  videoFooter: {
    padding: 16,
  },
  videoTag: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
});

export default FarmerHomeScreen;
