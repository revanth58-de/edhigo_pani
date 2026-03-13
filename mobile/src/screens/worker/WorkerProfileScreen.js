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
import { LinearGradient } from 'expo-linear-gradient';

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
        <LinearGradient
          colors={colors.primaryGradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('nav.profile')}</Text>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatarInner}>
              <MaterialIcons
                name={isEditing ? selectedAvatar : (user?.avatarIcon || 'person')}
                size={56}
                color={colors.primary}
              />
            </View>
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={() => setShowAvatarPicker(!showAvatarPicker)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="camera-alt" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {showAvatarPicker && (
            <View style={styles.avatarPicker}>
              <Text style={styles.avatarPickerTitle}>CHOOSE ICON</Text>
              <View style={styles.avatarPickerRow}>
                {AVATAR_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.avatarBox,
                      (isEditing ? selectedAvatar : (user?.avatarIcon || 'person')) === opt.icon && styles.avatarBoxActive,
                    ]}
                    onPress={() => {
                      setSelectedAvatar(opt.icon);
                      setShowAvatarPicker(false);
                    }}
                  >
                    <MaterialIcons
                      name={opt.icon}
                      size={22}
                      color={(isEditing ? selectedAvatar : (user?.avatarIcon || 'person')) === opt.icon ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.profileInfo}>
            {isEditing ? (
              <TextInput
                style={styles.nameInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.nameText}>{user?.name || t('common.worker')}</Text>
            )}
            <Text style={styles.phoneText}>{user?.phone || '+91 9876543210'}</Text>
          </View>

          {!isEditing && (
            <TouchableOpacity
              style={[styles.statusToggle, isAvailable && styles.statusToggleOn]}
              onPress={() => setIsAvailable(!isAvailable)}
              activeOpacity={0.8}
            >
              <View style={[styles.statusDot, isAvailable && styles.statusDotOn]} />
              <Text style={[styles.statusLabel, isAvailable && styles.statusLabelOn]}>
                {isAvailable ? 'AVAILABLE FOR WORK' : 'OFFLINE'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <MaterialIcons name="work-outline" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statNum}>{String(jobsDone)}</Text>
            <Text style={styles.statLabel}>JOBS</Text>
          </View>

          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFF7ED' }]}>
              <MaterialIcons name="star-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statNum}>{ratingAvg}</Text>
            <Text style={styles.statLabel}>RATING</Text>
          </View>

          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: '#F0FDF4' }]}>
              <MaterialIcons name="military-tech" size={24} color={colors.primary} />
            </View>
            {isEditing ? (
              <TextInput
                style={styles.statExpInput}
                value={editExperience}
                onChangeText={setEditExperience}
                keyboardType="number-pad"
                placeholder="yrs"
                placeholderTextColor="#9CA3AF"
                maxLength={2}
              />
            ) : (
              <Text style={styles.statNum}>{experience.split(' ')[0] || '0'}</Text>
            )}
            <Text style={styles.statLabel}>YEARS</Text>
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    height: Platform.OS === 'ios' ? 140 : 120,
    justifyContent: 'flex-end',
    paddingBottom: 20,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  content: { flex: 1 },
  contentContainer: { paddingBottom: 120 },

  profileCard: {
    backgroundColor: '#FFFFFF',
    marginTop: -30,
    marginHorizontal: 20,
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  avatarOuter: {
    marginBottom: 16,
    position: 'relative',
  },
  avatarInner: {
    width: 100,
    height: 100,
    borderRadius: 36,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#131811',
    letterSpacing: -0.5,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 4,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '900',
    color: '#131811',
    textAlign: 'center',
    paddingVertical: 8,
    minWidth: 200,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 10,
  },
  statusToggleOn: {
    backgroundColor: '#F0FDF4',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  statusDotOn: {
    backgroundColor: colors.primary,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  statusLabelOn: {
    color: colors.primary,
  },

  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#131811',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    marginTop: 4,
    letterSpacing: 1,
  },
  statExpInput: {
    fontSize: 18,
    fontWeight: '900',
    color: '#131811',
    textAlign: 'center',
    minWidth: 40,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
  },

  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#131811',
    letterSpacing: 0.5,
  },
  sectionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    lineHeight: 22,
  },
  villageInput: {
    fontSize: 15,
    fontWeight: '600',
    color: '#131811',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  addSkillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addSkillBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 14,
    marginBottom: 16,
  },
  customInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#131811',
  },
  customInputAdd: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customInputCancel: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skillChipSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  skillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  skillTextSelected: {
    color: '#166534',
  },

  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 32,
  },
  actionButton: {
    flex: 1,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '800',
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 24,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EF4444',
  },

  avatarPicker: {
    marginTop: 16,
    width: '100%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  avatarPickerTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9CA3AF',
    marginBottom: 12,
    letterSpacing: 1,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  avatarBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});

export default WorkerProfileScreen;
