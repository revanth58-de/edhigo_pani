// Screen 24: Worker Profile - Skills Add+ & Experience Level system
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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

const ALL_SKILLS = [
  'Harvesting', 'Sowing', 'Irrigation', 'Tractor Driving',
  'Pruning', 'Fertilizing', 'Pesticide Spray', 'Cleaning',
];

// ─────────────────────────────────────────────────────────────────────────────

const WorkerProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuthStore();
  const { t } = useTranslation();
  const [isAvailable, setIsAvailable] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Editable state
  const [editName, setEditName] = useState(user?.name || '');
  const [editVillage, setEditVillage] = useState(user?.village || '');
  const [editExperience, setEditExperience] = useState(String(user?.experience ?? ''));
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarIcon || 'person');
  const [editSkills, setEditSkills] = useState(
    typeof user?.skills === 'string'
      ? JSON.parse(user.skills)
      : (user?.skills || ['Harvesting', 'Sowing', 'Irrigation', 'Tractor Driving'])
  );

  // Custom skill add state (available in both view & edit modes)
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSkillText, setCustomSkillText] = useState('');

  const toggleSkill = (skill) => {
    if (editSkills.includes(skill)) {
      setEditSkills(editSkills.filter(s => s !== skill));
    } else {
      setEditSkills([...editSkills, skill]);
    }
  };

  const handleAddCustomSkill = () => {
    const trimmed = customSkillText.trim();
    if (!trimmed) return;
    if (!editSkills.includes(trimmed)) {
      setEditSkills(prev => [...prev, trimmed]);
    }
    setCustomSkillText('');  // clear but keep input open so user can add more
    // keep showCustomInput = true so user can keep typing more skills
  };

  const handleRemoveSkill = (skill) => {
    setEditSkills(prev => prev.filter(s => s !== skill));
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditVillage(user?.village || '');
      setEditExperience(String(user?.experience ?? ''));
      setSelectedAvatar(user?.avatarIcon || 'person');
      const currentSkills = typeof user?.skills === 'string'
        ? JSON.parse(user.skills)
        : (user?.skills || ['Harvesting', 'Sowing', 'Irrigation', 'Tractor Driving']);
      setEditSkills(currentSkills);
      setShowCustomInput(false);
      setCustomSkillText('');
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const expNum = parseInt(editExperience, 10);
      const payload = {
        name: editName,
        village: editVillage,
        skills: JSON.stringify(editSkills),
        avatarIcon: selectedAvatar,
        ...(editExperience !== '' && !isNaN(expNum) && { experience: expNum }),
      };
      await updateUser(payload);
      setIsEditing(false);
      setIsSaving(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      setIsSaving(false);
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  // Stats — from real backend data
  const jobsDone = user?.ratingCount ?? 0;               // updated when farmer rates after each job
  const ratingAvg = user?.ratingAvg ? user.ratingAvg.toFixed(1) : '—';
  const experience = user?.experience != null ? `${user.experience} yr${user.experience !== 1 ? 's' : ''}` : '—';

  const currentSkills = typeof user?.skills === 'string'
    ? JSON.parse(user.skills)
    : (user?.skills || editSkills);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={colors.backgroundDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nav.profile')}</Text>
        <View style={{ width: 28 }} />
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
            <Text style={styles.name}>{user?.name || t('common.worker')}</Text>
          )}

          <Text style={styles.phone}>{user?.phone || '+91 9876543210'}</Text>

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
          <View style={styles.statCard}>
            <MaterialIcons name="work" size={32} color={colors.primary} />
            <Text style={styles.statValue}>{String(jobsDone)}</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialIcons name="star" size={32} color={colors.primary} />
            <Text style={styles.statValue}>{ratingAvg}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>

          {/* Experience card — editable */}
          <View style={styles.statCard}>
            <MaterialIcons name="workspace-premium" size={32} color={colors.primary} />
            {isEditing ? (
              <TextInput
                style={styles.expInput}
                value={editExperience}
                onChangeText={setEditExperience}
                keyboardType="number-pad"
                placeholder="yrs"
                placeholderTextColor="#9CA3AF"
                maxLength={2}
              />
            ) : (
              <Text style={styles.statValue}>{experience}</Text>
            )}
            <Text style={styles.statLabel}>Experience</Text>
          </View>
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

        {/* ── Skills Section ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="construction" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Skills</Text>
            {/* Add+ button always visible */}
            <TouchableOpacity
              style={styles.addSkillBtn}
              onPress={() => {
                if (!isEditing) {
                  // Auto-enter edit mode so the new skill can be saved
                  setIsEditing(true);
                  setEditName(user?.name || '');
                  setEditVillage(user?.village || '');
                  setEditExperience(String(user?.experience ?? ''));
                  setSelectedAvatar(user?.avatarIcon || 'person');
                  const sk = typeof user?.skills === 'string'
                    ? JSON.parse(user.skills)
                    : (user?.skills || []);
                  setEditSkills(sk);
                }
                setShowCustomInput(v => !v);
              }}
            >
              <MaterialIcons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addSkillBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Custom skill inline input */}
          {showCustomInput && (
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                value={customSkillText}
                onChangeText={setCustomSkillText}
                placeholder="Type a skill…"
                placeholderTextColor="#9CA3AF"
                autoFocus
                onSubmitEditing={handleAddCustomSkill}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.customInputAdd} onPress={handleAddCustomSkill}>
                <MaterialIcons name="check" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customInputCancel}
                onPress={() => { setShowCustomInput(false); setCustomSkillText(''); }}
              >
                <MaterialIcons name="close" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.skillsContainer}>
            {isEditing ? (
              <>
                {/* Predefined toggles */}
                {ALL_SKILLS.map((skill, index) => {
                  const isSelected = editSkills.includes(skill);
                  return (
                    <TouchableOpacity
                      key={`pre-${index}`}
                      style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                      onPress={() => toggleSkill(skill)}
                    >
                      <Text style={[styles.skillText, isSelected && styles.skillTextSelected]}>{skill}</Text>
                      {isSelected && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })}
                {/* Custom skills — same selected (green) style, tap to remove */}
                {editSkills.filter(s => !ALL_SKILLS.includes(s)).map((skill, index) => (
                  <TouchableOpacity
                    key={`custom-${index}`}
                    style={[styles.skillChip, styles.skillChipSelected]}
                    onPress={() => handleRemoveSkill(skill)}
                  >
                    <Text style={[styles.skillText, styles.skillTextSelected]}>{skill}</Text>
                    <MaterialIcons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              currentSkills.map((skill, index) => (
                <View key={index} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleEditToggle}
                disabled={isSaving}
              >
                <MaterialIcons name="close" size={24} color="#9CA3AF" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={24} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={handleEditToggle}>
                <MaterialIcons name="edit" size={24} color={colors.primary} />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('WorkerHome', { tab: 'history' })}
              >
                <MaterialIcons name="history" size={24} color={colors.primary} />
                <Text style={styles.actionButtonText}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('WorkerPaymentHistory')}
              >
                <MaterialIcons name="account-balance-wallet" size={24} color={colors.primary} />
                <Text style={styles.actionButtonText}>Payments</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            if (Platform.OS === 'web') {
              if (typeof window !== 'undefined' && window.confirm('Are you sure you want to logout?')) {
                logout();
              }
            } else {
              Alert.alert('Logout', 'Are you sure you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: () => logout() },
              ]);
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
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.backgroundDark,
  },
  content: { flex: 1 },
  contentContainer: { paddingBottom: 120 },

  // Profile card
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
  phone: {
    fontSize: 16,
    color: '#6f8961',
    marginBottom: 16,
  },
  statusContainer: { marginTop: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
  },
  statusBadgeActive: { backgroundColor: `${colors.primary}33` },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9CA3AF',
  },
  statusDotActive: { backgroundColor: colors.primary },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6f8961',
  },
  statusTextActive: { color: '#131811' },



  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
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
    fontSize: 11,
    color: '#6f8961',
    textAlign: 'center',
  },

  // Sections
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
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
  },
  sectionValue: {
    fontSize: 16,
    color: '#6f8961',
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

  // Add skill button
  addSkillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  addSkillBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Custom skill inline input
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  customInput: {
    flex: 1,
    fontSize: 14,
    color: '#131811',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  customInputAdd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customInputCancel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Skills chips
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: `${colors.primary}1A`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skillChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  expInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 8,
    textAlign: 'center',
    minWidth: 48,
  },
  skillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#131811',
  },
  skillTextSelected: {
    color: '#FFFFFF',
  },

  // Actions
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
  saveButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { borderColor: '#9CA3AF' },
  cancelButtonText: { color: '#9CA3AF', fontWeight: 'bold' },

  // Logout
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

  // Avatar picker
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
