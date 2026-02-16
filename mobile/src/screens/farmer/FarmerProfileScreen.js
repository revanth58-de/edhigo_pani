// Screen 7: Farmer Profile - Exact match to farmer-profile.html
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';

const FarmerProfileScreen = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const [isEditing, setIsEditing] = useState(false);

  const handleVoiceGuidance = () => {
    Speech.speak('Your farm profile details', { language: 'en' });
  };

  const farmData = {
    totalLand: '50 Acres',
    crops: ['Rice', 'Wheat', 'Cotton'],
    animals: ['Cow (5)', 'Buffalo (2)', 'Goat (10)'],
    equipment: ['Tractor', 'Harvester', 'Pump Set'],
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <TopBar title="Farm Profile" showBack navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <MaterialIcons name="agriculture" size={60} color={colors.primary} />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <MaterialIcons name="edit" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{user?.name || 'Farmer Name'}</Text>
          <Text style={styles.phone}>{user?.phone || '+91 9876543210'}</Text>
          <Text style={styles.village}>{user?.village || 'Gachibowli, Hyderabad'}</Text>
        </View>

        {/* Farm Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <MaterialIcons name="landscape" size={32} color={colors.primary} />
            <Text style={styles.statValue}>{farmData.totalLand}</Text>
            <Text style={styles.statLabel}>Total Land</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="grass" size={32} color={colors.primary} />
            <Text style={styles.statValue}>{farmData.crops.length}</Text>
            <Text style={styles.statLabel}>Crops</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="pets" size={32} color={colors.primary} />
            <Text style={styles.statValue}>{farmData.animals.length}</Text>
            <Text style={styles.statLabel}>Animals</Text>
          </View>
        </View>

        {/* Crops Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="eco" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Crops Grown</Text>
          </View>
          <View style={styles.chipContainer}>
            {farmData.crops.map((crop, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{crop}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Animals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="pets" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Domestic Animals</Text>
          </View>
          <View style={styles.listContainer}>
            {farmData.animals.map((animal, index) => (
              <View key={index} style={styles.listItem}>
                <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                <Text style={styles.listText}>{animal}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Equipment Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="construction" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Farm Equipment</Text>
          </View>
          <View style={styles.chipContainer}>
            {farmData.equipment.map((item, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Edit Button */}
        <TouchableOpacity style={styles.editButton}>
          <MaterialIcons name="edit" size={24} color="#FFFFFF" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar role="farmer" activeTab="Profile" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 48,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.backgroundDark,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginTop: -30,
    marginHorizontal: 16,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.primary}1A`,
    borderWidth: 4,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
    color: '#6f8961',
    marginBottom: 4,
  },
  village: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
  },
  statLabel: {
    fontSize: 12,
    color: '#6f8961',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: `${colors.primary}1A`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#131811',
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listText: {
    fontSize: 16,
    color: '#131811',
  },
  editButton: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  editButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 32,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6f8961',
    textTransform: 'uppercase',
  },
  navTextActive: {
    color: colors.primary,
  },
});

export default FarmerProfileScreen;
