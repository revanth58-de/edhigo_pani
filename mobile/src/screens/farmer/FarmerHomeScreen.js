// Screen 6: Farmer Home - Exact match to farmer-home-work-type.html
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';

const FarmerHomeScreen = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    Speech.speak('Pani select cheyyandi. Select work type', { language: 'te' });
  }, []);

  const handleWorkTypeSelect = (workType) => {
    Speech.speak(`${workType} selected`, { language: 'en' });
    navigation.navigate('SelectWorkers', { workType });
  };

  const workTypes = [
    { id: 'sowing', name: 'Sowing', icon: 'grass', color: '#FFA500', bgColor: '#FFF5E6' },
    { id: 'harvesting', name: 'Harvesting', icon: 'agriculture', color: '#FFD700', bgColor: '#FFFBF0' },
    { id: 'irrigation', name: 'Irrigation', icon: 'water-drop', color: '#4A90E2', bgColor: '#E3F2FD' },
    { id: 'labour', name: 'Labour', icon: 'engineering', color: '#EF4444', bgColor: '#FEE2E2' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top App Bar with Help icon */}
      <TopBar title="Farmer Home" navigation={navigation} />

      {/* Main Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>


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
          {workTypes.map((workType, index) => (
            <TouchableOpacity
              key={workType.id}
              style={[styles.workTypeCard, index > 3 && styles.fullWidthCard]}
              activeOpacity={0.9}
              onPress={() => handleWorkTypeSelect(workType.name)}
            >
              <View style={[styles.iconCircle, { backgroundColor: workType.bgColor }]}>
                <MaterialIcons name={workType.icon} size={48} color={workType.color} />
              </View>
              <Text style={styles.workTypeName}>{workType.name}</Text>
              <View style={styles.playButton}>
                <MaterialIcons name="play-circle" size={24} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}

          {/* Tractor Card (Full Width) */}
          <TouchableOpacity
            style={styles.tractorCard}
            activeOpacity={0.9}
            onPress={() => handleWorkTypeSelect('Tractor')}
          >
            <View style={styles.tractorLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
                <MaterialIcons name="agriculture" size={48} color="#10B981" />
              </View>
              <Text style={styles.tractorName}>Tractor</Text>
            </View>
            <View style={styles.playButton}>
              <MaterialIcons name="play-circle" size={32} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
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
  headlineContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
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
    gap: 16,
  },
  workTypeCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fullWidthCard: {
    width: '100%',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workTypeName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1F2937',
  },
  playButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 9999,
    padding: 8,
  },
  tractorCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tractorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  tractorName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1F2937',
  },
});

export default FarmerHomeScreen;
