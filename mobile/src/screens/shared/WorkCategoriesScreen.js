// WorkCategoriesScreen - Redesigned to match Home Screen card style
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import GlassCard from '../../components/GlassCard';

const { width } = Dimensions.get('window');

const ALL_WORK_CATEGORIES = [
  { id: 'harvesting', name: 'Harvesting', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop' },
  { id: 'sowing', name: 'Sowing', image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=800&auto=format&fit=crop' },
  { id: 'irrigation', name: 'Irrigation', image: 'https://images.unsplash.com/photo-1563200192-3580893cc071?q=80&w=800&auto=format&fit=crop' },
  { id: 'tractor', name: 'Tractor Driving', image: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?q=80&w=800&auto=format&fit=crop' },
  { id: 'drone', name: 'Drone Service', image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=800&auto=format&fit=crop' },
  { id: 'drivers', name: 'Drivers/Operators', image: 'https://images.unsplash.com/photo-1591768793355-74d7acd51bd2?q=80&w=800&auto=format&fit=crop' },
  { id: 'pruning', name: 'Pruning', image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?q=80&w=800&auto=format&fit=crop' },
  { id: 'fertilizing', name: 'Fertilizing', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=800&auto=format&fit=crop' },
  { id: 'spraying', name: 'Pesticide Spray', image: 'https://images.unsplash.com/photo-1563514220747-a33e83e35a63?q=80&w=800&auto=format&fit=crop' },
  { id: 'cleaning', name: 'Field Cleaning', image: 'https://images.unsplash.com/photo-1599933334297-ba7af3e38706?q=80&w=800&auto=format&fit=crop' },
];

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
    transform: [{ translateY: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
  };

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(workType)}>
        <GlassCard intensity={40} style={styles.glassCard}>
          <View style={styles.imageBox}>
            <Image source={{ uri: workType.image }} style={styles.image} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.overlay} />
          </View>
          <View style={styles.content}>
            <Text style={styles.name} numberOfLines={1}>{workType.name}</Text>
            <View style={styles.footer}>
              <View style={styles.dot} />
              <Text style={styles.subText}>Find Specialists</Text>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
};

const WorkCategoriesScreen = ({ navigation }) => {
  const handleSelect = (category) => {
    navigation.navigate('LiveMapDiscovery', { workType: category });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <TopBar title="All Work Categories" showBack navigation={navigation} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {ALL_WORK_CATEGORIES.map((cat, index) => (
            <WorkTypeCard 
              key={cat.id} 
              workType={cat} 
              index={index} 
              onPress={handleSelect} 
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 18, paddingBottom: 40 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 3,
  },
  imageBox: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  footer: {
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
  subText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default WorkCategoriesScreen;
