// Screen 24: Worker Profile - Skills Add+ & Experience Level system
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Application from 'expo-application';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import BottomNavBar from '../../components/BottomNavBar';
import { LinearGradient } from 'expo-linear-gradient';
import { jobAPI, uploadAPI } from '../../services/api';
import DigitalIDCard from '../../components/worker/DigitalIDCard';
import CustomLoader from '../../components/CustomLoader';

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

const SkillChip = React.memo(({ skill, isSelected, onPress, isEditing, onRemove }) => {
  if (isEditing) {
    return (
      <TouchableOpacity
        style={[styles.skillChip, isSelected && styles.skillChipSelected]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.skillText, isSelected && styles.skillTextSelected]}>{skill}</Text>
        {isSelected && (
          <MaterialIcons 
            name={onRemove ? "close" : "check"} 
            size={14} 
            color="#FFFFFF" 
          />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.skillChip}>
      <Text style={styles.skillText}>{skill}</Text>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────

const WorkerProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser, refreshProfile } = useAuthStore();
  const appVersion = Application.nativeApplicationVersion || '1.0.0';
  const { t } = useTranslation();
  
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );
  const [isAvailable, setIsAvailable] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showDigitalID, setShowDigitalID] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const arrowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 10, duration: 800, useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(() => {
      setIsReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // ── Slide to Switch Logic ──
  const { width } = Dimensions.get('window');
  const SLIDE_WIDTH = width - 40; // margin 20*2
  const HANDLE_SIZE = 56;
  const END_THRESHOLD = SLIDE_WIDTH - HANDLE_SIZE - 20;

  const slideX = useRef(new Animated.Value(0)).current;
  const isSwitching = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (isSwitching.current) return;
        const newX = Math.max(0, Math.min(gesture.dx, SLIDE_WIDTH - HANDLE_SIZE));
        slideX.setValue(newX);
      },
      onPanResponderRelease: async (_, gesture) => {
        if (isSwitching.current) return;
        if (gesture.dx >= END_THRESHOLD) {
          isSwitching.current = true;
          // Animate to end
          Animated.timing(slideX, { toValue: SLIDE_WIDTH - HANDLE_SIZE, duration: 100, useNativeDriver: true }).start();
          
          // Trigger switch
          Alert.alert("Switching Mode", "Switching to Farmer Dashboard...");
          try {
            const { setRole } = useAuthStore.getState();
            await setRole('farmer');
            // Reactive navigation is handled automatically by AppNavigator when role changes
          } catch (err) {
            Alert.alert("Error", "Failed to switch role.");
            // Reset
            isSwitching.current = false;
            Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
          }
        } else {
          // Snap back
          Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // Editable state
  const [editName, setEditName] = useState(user?.name || '');
  const [editVillage, setEditVillage] = useState(user?.village || '');
  const [editExperience, setEditExperience] = useState(String(user?.experience ?? ''));
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarIcon || 'person');
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(user?.photoUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
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

  // ── Profile Picture Select & Multipart Upload (M4) ──
  const handlePickAndUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to upload a photo.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setIsUploadingPhoto(true);
        const localUri = result.assets[0].uri;
        const filename = localUri.split('/').pop();

        // Infer type
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        const formData = new FormData();
        formData.append('image', {
          uri: localUri,
          name: filename,
          type,
        });

        const res = await uploadAPI.uploadProfilePicture(formData);
        if (res.data?.url) {
          const uploadedUrl = res.data.url;
          if (isEditing) {
            setSelectedPhotoUrl(uploadedUrl);
          } else {
            // Update immediately if not currently in edit mode
            await updateUser({ photoUrl: uploadedUrl });
            Alert.alert('Success', 'Profile picture updated successfully!');
          }
        }
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      Alert.alert('Error', 'Failed to upload photo. Please check your connection.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleEditAvatarPress = () => {
    if (Platform.OS === 'web') {
      const choice = window.prompt("Choose option:\n1 - Upload Custom Photo\n2 - Choose Built-in Icon");
      if (choice === '1') {
        handlePickAndUploadPhoto();
      } else if (choice === '2') {
        setShowAvatarPicker(true);
      }
    } else {
      Alert.alert(
        "Profile Photo",
        "Choose an option to update your profile photo:",
        [
          { text: "Upload Custom Photo", onPress: handlePickAndUploadPhoto },
          { text: "Choose Built-in Icon", onPress: () => setShowAvatarPicker(true) },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditVillage(user?.village || '');
      setEditExperience(String(user?.experience ?? ''));
      setSelectedAvatar(user?.avatarIcon || 'person');
      setSelectedPhotoUrl(user?.photoUrl || '');
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
        photoUrl: selectedPhotoUrl,
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
        
        {/* Digital ID Toggle */}
        <View style={styles.idToggleContainer}>
          <TouchableOpacity 
            style={[styles.idToggleBtn, showDigitalID && styles.idToggleBtnActive]}
            onPress={() => setShowDigitalID(!showDigitalID)}
          >
            <MaterialIcons name="badge" size={20} color={showDigitalID ? '#FFF' : colors.primary} />
            <Text style={[styles.idToggleText, showDigitalID && styles.idToggleTextActive]}>
              {showDigitalID ? 'Hide Digital ID' : 'Show Digital ID'}
            </Text>
          </TouchableOpacity>
        </View>

        {showDigitalID && <DigitalIDCard user={user} />}

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatarInner}>
              {isUploadingPhoto ? (
                <CustomLoader size={32} color={colors.primary} />
              ) : (isEditing ? selectedPhotoUrl : user?.photoUrl) ? (
                <Image
                  source={{ uri: isEditing ? selectedPhotoUrl : user.photoUrl }}
                  style={styles.profilePhoto}
                />
              ) : (
                <MaterialIcons
                  name={isEditing ? selectedAvatar : (user?.avatarIcon || 'person')}
                  size={56}
                  color={colors.primary}
                />
              )}
            </View>
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={handleEditAvatarPress}
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

        {/* Defer bottom sections to mount quickly (M5) */}
        {(isReady || isEditing) && (
          <>
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
                    {ALL_SKILLS.map((skill, index) => (
                      <SkillChip
                        key={`pre-${index}`}
                        skill={skill}
                        isSelected={editSkills.includes(skill)}
                        isEditing={true}
                        onPress={() => toggleSkill(skill)}
                      />
                    ))}
                    {/* Custom skills — same selected (green) style, tap to remove */}
                    {editSkills.filter(s => !ALL_SKILLS.includes(s)).map((skill, index) => (
                      <SkillChip
                        key={`custom-${index}`}
                        skill={skill}
                        isSelected={true}
                        isEditing={true}
                        onRemove={true}
                        onPress={() => handleRemoveSkill(skill)}
                      />
                    ))}
                  </>
                ) : (
                  currentSkills.map((skill, index) => (
                    <SkillChip
                      key={index}
                      skill={skill}
                      isEditing={false}
                    />
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
                      <CustomLoader size={24} color="#FFFFFF" />
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
                    onPress={() => navigation.navigate('WorkerBookings')}
                  >
                    <MaterialIcons name="history" size={24} color={colors.primary} />
                    <Text style={styles.actionButtonText}>My Bookings</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {!isEditing && (
              <>
                <View style={[styles.actionsContainer, { marginTop: 12 }]}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('WorkerMachinery')}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="agriculture" size={24} color={colors.primary} />
                    <Text style={styles.actionButtonText} adjustsFontSizeToFit numberOfLines={1}>
                      {t('machinery.myMachinery', 'My Farm Machinery')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('AIChatbot')}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="chat" size={24} color={colors.primary} />
                    <Text style={styles.actionButtonText} adjustsFontSizeToFit numberOfLines={1}>
                      Voice Support
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.actionsContainer, { marginTop: 12 }]}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('DisputeHistory')}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="gavel" size={24} color={colors.primary} />
                    <Text style={styles.actionButtonText} adjustsFontSizeToFit numberOfLines={1}>
                      Disputes History
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Role Switcher (Slide to Switch) */}
            {!isEditing && (
              <View style={styles.roleSwitchCard}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.roleSwitchGradient}>
                  {/* Background Text */}
                  <View style={styles.slideTrackTextContainer}>
                    <Text style={styles.slideTrackText}>Slide to Switch to Farmer Mode</Text>
                  </View>

                  {/* Draggable Handle */}
                  <Animated.View 
                    {...panResponder.panHandlers}
                    style={[
                      styles.slideHandle,
                      { transform: [{ translateX: slideX }] }
                    ]}
                  >
                    <LinearGradient colors={['#FFF', '#F3F4F6']} style={styles.handleInner}>
                      <MaterialIcons name="agriculture" size={28} color={colors.primary} />
                    </LinearGradient>
                  </Animated.View>
                </LinearGradient>
              </View>
            )}

            {/* Notifications Button */}
            <TouchableOpacity
              style={styles.notificationsButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <MaterialIcons name="notifications-none" size={22} color={colors.primary} />
              <Text style={styles.notificationsButtonText}>{t('notifications.title')}</Text>
            </TouchableOpacity>

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

            {/* App Version */}
            <Text style={styles.versionText}>Version {appVersion}</Text>

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      <BottomNavBar role={user?.role || "worker"} activeTab="Profile" />
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
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  // Digital ID Styles
  idToggleContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  idToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  idToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  idToggleText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  idToggleTextActive: {
    color: '#FFF',
  },
  idCardContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 12,
    shadowColor: '#1F8A3D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  idCardGradient: {
    borderRadius: 24,
    padding: 20,
  },
  idCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  idCardBrand: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  verifiedChipText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
  idCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  idAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFF',
    padding: 2,
  },
  idAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idInfo: {
    flex: 1,
  },
  idName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  idRole: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  idNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  idQRWrap: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idCardFooter: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  validText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },

  profileCard: {
    backgroundColor: '#FFFFFF',
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
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
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
    fontWeight: 'bold',
    color: '#131811',
    letterSpacing: -0.5,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 4,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: 'bold',
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
    fontSize: 13,
    fontWeight: 'bold',
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
    fontSize: 22,
    fontWeight: '800',
    color: '#131811',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 4,
    letterSpacing: 1,
  },
  statExpInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
    textAlign: 'center',
    width: 60,
    padding: 0,
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
    fontWeight: 'bold',
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
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '700',
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '700',
  },

  notificationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 24,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  notificationsButtonText: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
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
  logoutButtonText: { fontSize: 16, fontWeight: 'bold', color: '#EF4444' },
  versionText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 20 },
  roleSwitchCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  roleSwitchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    height: 68,
    position: 'relative',
  },
  slideTrackTextContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 40,
  },
  slideTrackText: {
    fontSize: 14,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  slideHandle: {
    width: 56,
    height: 56,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  handleInner: {
    flex: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowContainer: {
    // Handled by inline transform
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
