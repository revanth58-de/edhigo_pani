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
  Dimensions,
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
import { MandiPricesWidget, AIAdvisoryBanner } from '../../components/EcosystemWidgets';
import { socketService } from '../../services/socketService';

const { width } = Dimensions.get('window');

const WorkTypeCard = ({ workType, onPress, index }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      tension: 20,
      friction: 7,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const animatedStyle = {
    opacity: animatedValue,
    transform: [
      {
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.workTypeWrapper, animatedStyle]}>
      <TouchableOpacity
        style={styles.cardTouch}
        activeOpacity={0.9}
        onPress={() => onPress(workType)}
      >
        <View style={styles.workTypeCard}>
          <Image source={{ uri: workType.image }} style={styles.cardImage} />
          <View style={styles.cardOverlay} />
          <View style={styles.cardContent}>
            <View style={styles.iconCircle}>
              <MaterialIcons name={workType.icon || 'engineering'} size={20} color="#FFF" />
            </View>
            <Text style={styles.workTypeName} numberOfLines={1}>{workType.name}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const FarmerHomeScreen = ({ navigation }) => {
  const { user, refreshProfile } = useAuthStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Workforce');

  const categories = ['Workforce', 'Machinery', 'Services'];

  const mandiPrices = [
    { crop: 'Wheat', price: '2,125', change: '+2.4', trend: 'up' },
    { crop: 'Cotton', price: '6,450', change: '-1.2', trend: 'down' },
    { crop: 'Rice', price: '3,800', change: '+0.8', trend: 'up' },
    { crop: 'Maize', price: '1,950', change: '+1.5', trend: 'up' },
  ];

  const workTypes = [
    // Workforce
    { id: 'sowing', name: 'Sowing', category: 'Workforce', icon: 'grass', image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=400' },
    { id: 'harvesting', name: 'Harvesting', category: 'Workforce', icon: 'agriculture', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=400' },
    { id: 'irrigation', name: 'Irrigation', category: 'Workforce', icon: 'water_drop', image: 'https://images.unsplash.com/photo-1563200192-3580893cc071?q=80&w=400' },
    // Machinery
    { id: 'tractor', name: 'Tractor Booking', category: 'Machinery', icon: 'minor_crash', image: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=400' },
    { id: 'drone', name: 'Drone Spraying', category: 'Machinery', icon: 'settings_input_antenna', image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=400' },
    { id: 'harvester', name: 'Harvester', category: 'Machinery', icon: 'precision_manufacturing', image: 'https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?q=80&w=400' },
    // Services
    { id: 'transport', name: 'Farm Transport', category: 'Services', icon: 'local_shipping', image: 'https://images.unsplash.com/photo-1586191582056-94033be1556a?q=80&w=400' },
    { id: 'soil', name: 'Soil Testing', category: 'Services', icon: 'science', image: 'https://images.unsplash.com/photo-1581093196277-9f608ebab48c?q=80&w=400' },
    { id: 'advisory', name: 'Crop Advisory', category: 'Services', icon: 'support_agent', image: 'https://images.unsplash.com/photo-1599406561184-a16df086ecaa?q=80&w=400' },
  ];

  const handleVoiceSearch = () => {
    setIsListening(true);
    setTimeout(() => setIsListening(false), 2000);
  };

  const handleWorkTypeSelect = (workType) => {
    if (workType.category === 'Machinery') {
      navigation.navigate('MachineryBooking', { machineType: workType.name });
    } else {
      navigation.navigate('LiveMapDiscovery', { workType });
    }
  };

  const filteredWorkTypes = workTypes.filter(wt => 
    wt.category === activeCategory && 
    wt.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Header */}
        <LinearGradient 
          colors={[colors.primary, colors.primaryDark]} 
          style={styles.heroSection}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.greetingText}>Dinasari</Text>
              <Text style={styles.heroSubText}>Namaste, {user?.fullName?.split(' ')[0] || 'Farmer'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <MaterialIcons name="notifications-none" size={24} color="#FFF" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color="#94A3B8" />
            <TextInput
              placeholder="Search services, machinery..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
            <TouchableOpacity onPress={handleVoiceSearch}>
              <MaterialIcons name="mic" size={24} color={isListening ? colors.accent : colors.primary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <WeatherLocationHeader />

        {/* Mandi Prices */}
        <MandiPricesWidget prices={mandiPrices} navigation={navigation} />

        {/* AI Advisory */}
        <AIAdvisoryBanner 
          advice="Optimal soil moisture detected. Ideal for Rice sowing today." 
          navigation={navigation}
        />

        {/* Categories Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Work Categories</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WorkCategories')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Category Tabs */}
        <View style={styles.categoryTabs}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat}
              style={[styles.categoryTab, activeCategory === cat && styles.activeTab]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.tabText, activeCategory === cat && styles.activeTabText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.grid}>
          {filteredWorkTypes.map((workType, index) => (
            <WorkTypeCard
              key={workType.id}
              index={index}
              workType={workType}
              onPress={handleWorkTypeSelect}
            />
          ))}
        </View>

        {/* Video Tutorial Section */}
        <View style={styles.videoSection}>
          <Text style={styles.sectionTitle}>Ecosystem in Action</Text>
          <GlassCard intensity={20} style={styles.videoCard}>
            <View style={styles.videoWrapper}>
              <WebView
                source={{ uri: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }}
                style={styles.webView}
                allowsFullscreenVideo
              />
            </View>
            <View style={styles.videoFooter}>
              <Text style={styles.videoTitle}>Modernizing Rural Workflows</Text>
            </View>
          </GlassCard>
        </View>
      </ScrollView>

      {/* AI Assistant FAB */}
      <TouchableOpacity 
        style={styles.aiFAB}
        onPress={() => navigation.navigate('AIChatbot')}
        activeOpacity={0.9}
      >
        <LinearGradient colors={['#FACC15', '#EAB308']} style={styles.aiFABGradient}>
          <MaterialIcons name="psychology" size={32} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

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
    paddingBottom: 120,
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
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  heroSubText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginTop: 2,
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
  searchBar: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
    marginLeft: 12,
  },

  // Categories
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 12,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFF',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  workTypeWrapper: {
    width: '33.33%',
    padding: 8,
  },
  cardTouch: {
    width: '100%',
  },
  workTypeCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    height: 120,
    justifyContent: 'flex-end',
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardContent: {
    padding: 12,
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    backdropColor: 'rgba(255, 255, 255, 0.2)',
  },
  workTypeName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },

  // Video Section
  videoSection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 32,
    marginBottom: 8,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  videoCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    elevation: 6,
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
  videoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },

  // AI FAB
  aiFAB: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 10,
    shadowColor: '#EAB308',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  aiFABGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FarmerHomeScreen;
