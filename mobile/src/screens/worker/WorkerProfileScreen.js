// Screen 24: Worker Profile - Exact match to worker-profile.html
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import BottomNavBar from '../../components/BottomNavBar';

const AVATAR_OPTIONS = [
  { key: 'agriculture', icon: 'agriculture' },
  { key: 'person', icon: 'person' },
  { key: 'eco', icon: 'eco' },
  { key: 'grass', icon: 'grass' },
];

const WorkerProfileScreen = ({ navigation }) => {
  const { user, logout, isVoiceEnabled } = useAuthStore();
  const [isAvailable, setIsAvailable] = useState(true);

  const handleVoiceGuidance = () => {
    if (isVoiceEnabled) {
      Speech.speak('Your profile information', { language: 'en' });
    }
  };

  const stats = [
    { label: 'Jobs Done', value: '24', icon: 'work' },
    { label: 'Rating', value: '4.8', icon: 'star' },
    { label: 'Earnings', value: '₹12,000', icon: 'payments' },
  ];

  const skills = ['Harvesting', 'Sowing', 'Irrigation', 'Tractor Driving'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={colors.backgroundDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nav.profile')}</Text>
        <TouchableOpacity onPress={handleVoiceGuidance}>
          <MaterialIcons name="volume-up" size={28} color={colors.backgroundDark} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <MaterialIcons
                name={isEditing ? selectedAvatar : (user?.avatarIcon || 'person')}
                size={60}
                color={colors.primary}
              />
            </View>
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={() => setShowAvatarPicker(!showAvatarPicker)}
            >
              <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {showAvatarPicker && (
            <View style={styles.avatarPicker}>
              <Text style={styles.avatarPickerTitle}>Choose Profile Icon</Text>
              <View style={styles.avatarPickerRow}>
                {AVATAR_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.avatarOption,
                      (isEditing ? selectedAvatar : (user?.avatarIcon || 'person')) === opt.icon && styles.avatarOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedAvatar(opt.icon);
                      setShowAvatarPicker(false);
                    }}
                  >
                    <MaterialIcons
                      name={opt.icon}
                      size={24}
                      color={(isEditing ? selectedAvatar : (user?.avatarIcon || 'person')) === opt.icon ? '#FFFFFF' : colors.primary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your Name"
              placeholderTextColor="#9CA3AF"
            />
          ) : (
            <Text style={styles.name}>{user?.name || 'Worker Name'}</Text>
          )}

          <Text style={styles.phone}>{user?.phone || '+91 9876543210'}</Text>

          {/* Status Toggle (only in view mode for simplicity) */}
          {!isEditing && (
            <View style={styles.statusContainer}>
              <TouchableOpacity
                style={[styles.statusBadge, isAvailable && styles.statusBadgeActive]}
                onPress={() => setIsAvailable(!isAvailable)}
              >
                <View style={[styles.statusDot, isAvailable && styles.statusDotActive]} />
                <Text style={[styles.statusText, isAvailable && styles.statusTextActive]}>
                  {isAvailable ? 'Available' : 'Offline'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <MaterialIcons name={stat.icon} size={32} color={colors.primary} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Village Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="location-on" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('profile.village')}</Text>
          </View>
          {isEditing ? (
            <TextInput
              style={styles.villageInput}
              value={editVillage}
              onChangeText={setEditVillage}
              placeholder="Village Name"
              placeholderTextColor="#9CA3AF"
            />
          ) : (
            <Text style={styles.sectionValue}>{user?.village || 'Add your village in Edit Profile'}</Text>
          )}
        </View>

        {/* Skills Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="construction" size={24} color="#131811" />
            <Text style={styles.sectionTitle}>Skills</Text>
          </View>
          <View style={styles.skillsContainer}>
            {skills.map((skill, index) => (
              <View key={index} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Village Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="location-on" size={24} color="#131811" />
            <Text style={styles.sectionTitle}>Village</Text>
          </View>
          <Text style={styles.sectionValue}>{user?.village || 'Gachibowli, Hyderabad'}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="edit" size={24} color={colors.primary} />
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="history" size={24} color={colors.primary} />
            <Text style={styles.actionButtonText}>Work History</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            if (Platform.OS === 'web') {
              if (window.confirm('Are you sure you want to logout?')) {
                logout();
              }
            } else {
              Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => logout(),
                  },
                ]
              );
            }
          }}
        >
          <MaterialIcons name="logout" size={22} color="#EF4444" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavBar role="worker" activeTab="Profile" />
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
  nameInput: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#131811',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 8,
    textAlign: 'center',
    width: '80%',
  },
  villageInput: {
    fontSize: 16,
    color: '#131811',
    borderBottomWidth: 1,
    borderBottomColor: `${colors.primary}66`,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 4,
    width: '100%',
  },
  phone: {
    fontSize: 16,
    color: '#6f8961',
    marginBottom: 16,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
  },
  statusBadgeActive: {
    backgroundColor: `${colors.primary}33`,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9CA3AF',
  },
  statusDotActive: {
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6f8961',
  },
  statusTextActive: {
    color: '#131811',
  },
  statsGrid: {
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131811',
  },
  statLabel: {
    fontSize: 12,
    color: '#6f8961',
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
  sectionValue: {
    fontSize: 16,
    color: '#6f8961',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: `${colors.primary}1A`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  skillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#131811',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
  cancelButton: {
    borderColor: '#9CA3AF',
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  avatarPicker: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  avatarPickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${colors.primary}33`,
  },
  avatarOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});

export default WorkerProfileScreen;
