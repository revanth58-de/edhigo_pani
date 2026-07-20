// Screen 7: Farmer Profile - Fully editable with image-based view mode, custom inline adders, expo-image-picker, and lazy loading
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
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { authAPI, uploadAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Application from 'expo-application';
import BottomNavBar from '../../components/BottomNavBar';
import CustomLoader from '../../components/CustomLoader';

// ─── Animal Data with emoji ───
const ANIMALS = [
  { key: 'cow', label: 'Cow', emoji: '🐄' },
  { key: 'buffalo', label: 'Buffalo', emoji: '🐃' },
  { key: 'goat', label: 'Goat', emoji: '🐐' },
  { key: 'hen', label: 'Hen', emoji: '🐓' },
  { key: 'sheep', label: 'Sheep', emoji: '🐑' },
  { key: 'pig', label: 'Pig', emoji: '🐷' },
];

// ─── Crop Data with emoji ───
const ALL_CROPS = [
  { key: 'Paddy', emoji: '🌾' },
  { key: 'Mango', emoji: '🥭' },
  { key: 'Banana', emoji: '🍌' },
  { key: 'Orange', emoji: '🍊' },
  { key: 'Lemon', emoji: '🍋' },
  { key: 'Papaya', emoji: '🥭' },
  { key: 'Sapota', emoji: '🍐' },
  { key: 'Pomegranate', emoji: '❤️' },
  { key: 'Guava', emoji: '🍈' },
  { key: 'Pulses', emoji: '🌱' },
  { key: 'Cotton', emoji: '🌿' },
  { key: 'Sugarcane', emoji: '🎋' },
  { key: 'Tobacco', emoji: '🚬' },
  { key: 'Cashew', emoji: '🌰' },
  { key: 'Groundnut', emoji: '🥜' },
  { key: 'Sesame', emoji: '🌾' },
  { key: 'Sunflower', emoji: '🌻' },
  { key: 'Castor', emoji: '🌿' },
  { key: 'Red Gram', emoji: '🫘' },
  { key: 'Black Gram', emoji: '🫘' },
  { key: 'Green Gram', emoji: '🫘' },
  { key: 'Bengal Gram', emoji: '🫘' },
  { key: 'Chilli', emoji: '🌶️' },
  { key: 'Oilseeds', emoji: '🟡' },
];

// ─── Equipment Data with emoji ───
const ALL_EQUIPMENT = [
  { key: 'Tractor', emoji: '🚜' },
  { key: 'Harvester', emoji: '⚙️' },
  { key: 'Pump Set', emoji: '💧' },
  { key: 'Plough', emoji: '🔧' },
  { key: 'Sprayer', emoji: '🌊' },
  { key: 'Thresher', emoji: '🏭' },
];

// ─── Matching Radius Options (km) ───
const RADIUS_OPTIONS = [5, 10, 15, 20, 25, 30];
const DEFAULT_RADIUS = 10;

// ─── Avatar Options ───
const AVATAR_OPTIONS = [
  { key: 'agriculture', icon: 'agriculture' },
  { key: 'person', icon: 'person' },
  { key: 'eco', icon: 'eco' },
  { key: 'grass', icon: 'grass' },
];

// ─── Helpers ───
const parseAnimals = (str) => {
  if (!str) return {};
  if (typeof str === 'object' && !Array.isArray(str)) return str;
  try { return JSON.parse(str); } catch { return {}; }
};
const stringifyAnimals = (obj) =>
  JSON.stringify(Object.fromEntries(Object.entries(obj).filter(([, v]) => v > 0)));

const parseCrops = (str) => {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  if (typeof str === 'string') {
    try { return JSON.parse(str); } catch { return str.split(',').map(s => s.trim()); }
  }
  return [];
};
const stringifyCrops = (arr) => JSON.stringify(arr);

const parseEquipment = (str) => {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  if (typeof str === 'string') {
    try { return JSON.parse(str); } catch { return str.split(',').map(s => s.trim()); }
  }
  return [];
};
const stringifyEquipment = (arr) => JSON.stringify(arr);

// ─── Memoized Sub-components ───

// Image-style card for view mode
const EmojiCard = React.memo(({ emoji, label, count }) => (
  <View style={cardStyles.card}>
    <View style={cardStyles.emojiBox}>
      <Text style={cardStyles.emoji}>{emoji}</Text>
    </View>
    <Text style={cardStyles.label} numberOfLines={1}>{label}</Text>
    {count !== undefined && (
      <View style={cardStyles.badge}>
        <Text style={cardStyles.badgeText}>{count}</Text>
      </View>
    )}
  </View>
));

const cardStyles = StyleSheet.create({
  card: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
    marginBottom: 8,
  },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emoji: { fontSize: 28 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#131811',
    textAlign: 'center',
  },
  badge: {
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
});

// ─── Main Screen ───
const FarmerProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser, refreshProfile } = useAuthStore();
  const { t } = useTranslation();
  const appVersion = Application.nativeApplicationVersion || '1.0.0';

  const language = useAuthStore((state) => state.language) || 'te';
  const setLanguage = useAuthStore((state) => state.setLanguage);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(user?.photoUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Custom Inline Crop and Equipment Adders
  const [customCropText, setCustomCropText] = useState('');
  const [customEquipmentText, setCustomEquipmentText] = useState('');

  const arrowAnim = useRef(new Animated.Value(0)).current;

  // Defer heavy section layouts by 150ms for buttery-smooth transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 10, duration: 800, useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
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
          Alert.alert("Switching Mode", "Switching to Labour Dashboard...");
          try {
            const { setRole } = useAuthStore.getState();
            await setRole('worker');
          } catch (err) {
            Alert.alert("Error", "Failed to switch role.");
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
  const [editName, setEditName] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editLandAcres, setEditLandAcres] = useState('');
  const [editAnimals, setEditAnimals] = useState({});
  const [editCrops, setEditCrops] = useState([]);
  const [editEquipment, setEditEquipment] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState('agriculture');
  const [editMatchingRadius, setEditMatchingRadius] = useState(DEFAULT_RADIUS);

  // View mode data (from user store)
  const viewAnimals = parseAnimals(user?.animals);
  const viewCrops = parseCrops(user?.crops);
  const viewEquipment = parseEquipment(user?.equipment);
  const viewLand = user?.landAcres ? `${user.landAcres} Acres` : '—';

  // Toggle dynamic translation instantly
  const toggleLanguage = async () => {
    const nextLang = language === 'en' ? 'te' : 'en';
    await setLanguage(nextLang);
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditName(user?.name || '');
      setEditVillage(user?.village || '');
      setEditLandAcres(user?.landAcres ? String(user.landAcres) : '');
      setEditAnimals(parseAnimals(user?.animals));
      setEditCrops(parseCrops(user?.crops));
      setEditEquipment(parseEquipment(user?.equipment));
      setSelectedAvatar(user?.avatarIcon || 'agriculture');
      setSelectedPhotoUrl(user?.photoUrl || '');
      setEditMatchingRadius(user?.matchingRadius ?? DEFAULT_RADIUS);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: editName.trim() || undefined,
        village: editVillage.trim() || undefined,
        landAcres: editLandAcres ? parseFloat(editLandAcres) : undefined,
        animals: stringifyAnimals(editAnimals),
        skills: stringifyCrops(editCrops),       // reusing skills field for crops
        status: stringifyEquipment(editEquipment), // reusing status field for equipment (temp)
        avatarIcon: selectedAvatar,
        photoUrl: selectedPhotoUrl,
        matchingRadius: editMatchingRadius,
      };
      const response = await authAPI.updateProfile(payload);
      updateUser({
        ...response.data.user,
        crops: stringifyCrops(editCrops),
        equipment: stringifyEquipment(editEquipment),
      });
      setIsEditing(false);
      Alert.alert('✅ Saved', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnimalCount = (key, delta) => {
    setEditAnimals((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta),
    }));
  };

  const toggleCrop = (key) => {
    setEditCrops((prev) => {
      if (prev.includes(key)) {
        return prev.filter((c) => c !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const toggleEquipment = (key) => {
    setEditEquipment((prev) => {
      if (prev.includes(key)) {
        return prev.filter((e) => e !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // ── Profile Photo Dual Selector Functions ──
  const handlePickPhoto = async () => {
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
        quality: 0.6,
      });

      if (!result.canceled) {
        await processAndSavePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Photo gallery pick error:', error);
      Alert.alert('Error', 'Failed to pick photo.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera permissions to capture a photo.');
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (!result.canceled) {
        await processAndSavePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Photo camera capture error:', error);
      Alert.alert('Error', 'Failed to capture photo.');
    }
  };

  const processAndSavePhoto = async (localUri) => {
    setIsUploadingPhoto(true);
    try {
      const filename = localUri.split('/').pop();
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
          await updateUser({ photoUrl: uploadedUrl });
          Alert.alert('Success', 'Profile picture updated successfully!');
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
      const choice = window.prompt("Choose option:\n1 - Camera Capture\n2 - Gallery Upload\n3 - Choose Built-in Icon");
      if (choice === '1') {
        handleTakePhoto();
      } else if (choice === '2') {
        handlePickPhoto();
      } else if (choice === '3') {
        setShowAvatarPicker(true);
      }
    } else {
      Alert.alert(
        "Profile Photo",
        "Choose an option to update your profile photo:",
        [
          { text: "Camera Capture", onPress: handleTakePhoto },
          { text: "Gallery Upload", onPress: handlePickPhoto },
          { text: "Choose Built-in Icon", onPress: () => setShowAvatarPicker(true) },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const handleAddCustomCrop = () => {
    const trimmed = customCropText.trim();
    if (!trimmed) return;
    if (!editCrops.includes(trimmed)) {
      setEditCrops((prev) => [...prev, trimmed]);
    }
    setCustomCropText('');
  };

  const handleAddCustomEquipment = () => {
    const trimmed = customEquipmentText.trim();
    if (!trimmed) return;
    if (!editEquipment.includes(trimmed)) {
      setEditEquipment((prev) => [...prev, trimmed]);
    }
    setCustomEquipmentText('');
  };

  const animalCount = Object.values(viewAnimals).filter((v) => v > 0).length;

  // Combine predefined crops/equipment with user custom additions in edit mode
  const availableCrops = [
    ...ALL_CROPS,
    ...editCrops
      .filter((c) => !ALL_CROPS.some((ac) => ac.key === c))
      .map((c) => ({ key: c, emoji: '🌱' })),
  ];

  const availableEquipment = [
    ...ALL_EQUIPMENT,
    ...editEquipment
      .filter((e) => !ALL_EQUIPMENT.some((ae) => ae.key === e))
      .map((e) => ({ key: e, emoji: '⚙️' })),
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Premium Linear Gradient Header with instant Language Toggler */}
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
          <Text style={styles.headerTitle}>{t('profile.farmProfile')}</Text>
          <TouchableOpacity style={styles.langToggleBtn} onPress={toggleLanguage} activeOpacity={0.85}>
            <Text style={styles.langToggleText}>
              {language === 'en' ? '🇮🇳 తెలుగు' : '🇬🇧 EN'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>

        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {isUploadingPhoto ? (
                <CustomLoader size={32} color={colors.primary} />
              ) : (isEditing ? selectedPhotoUrl : user?.photoUrl) ? (
                <Image
                  source={{ uri: isEditing ? selectedPhotoUrl : user.photoUrl }}
                  style={styles.profilePhoto}
                />
              ) : (
                <MaterialIcons
                  name={isEditing ? selectedAvatar : (user?.avatarIcon || 'agriculture')}
                  size={60}
                  color={colors.primary}
                />
              )}
            </View>
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={handleEditAvatarPress}
              activeOpacity={0.8}
            >
              <MaterialIcons name="camera-alt" size={18} color="#FFFFFF" />
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
                      (isEditing ? selectedAvatar : (user?.avatarIcon || 'agriculture')) === opt.icon && styles.avatarOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedAvatar(opt.icon);
                      setShowAvatarPicker(false);
                    }}
                  >
                    <MaterialIcons
                      name={opt.icon}
                      size={32}
                      color={(isEditing ? selectedAvatar : (user?.avatarIcon || 'agriculture')) === opt.icon ? '#FFFFFF' : colors.primary}
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
            <Text style={styles.name}>{user?.name || t('common.farmer')}</Text>
          )}

          <Text style={styles.phone}>{user?.phone ? `+91 ${user.phone}` : '—'}</Text>

          {isEditing ? (
            <TextInput
              style={styles.villageInput}
              value={editVillage}
              onChangeText={setEditVillage}
              placeholder="Village, District"
              placeholderTextColor="#9CA3AF"
            />
          ) : (
            <Text style={styles.village}>{user?.village || 'Add your village in Edit Profile'}</Text>
          )}
        </View>

        {/* ── Farm Stats ── */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <MaterialIcons name="landscape" size={32} color={colors.primary} />
            {isEditing ? (
              <TextInput
                style={styles.statInput}
                value={editLandAcres}
                onChangeText={setEditLandAcres}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.statValue}>{viewLand}</Text>
            )}
            <Text style={styles.statLabel}>{t('profile.totalLand')}</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="grass" size={32} color={colors.primary} />
            <Text style={styles.statValue}>{isEditing ? editCrops.length : viewCrops.length}</Text>
            <Text style={styles.statLabel}>{t('profile.crops')}</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="pets" size={32} color={colors.primary} />
            <Text style={styles.statValue}>
              {isEditing
                ? Object.values(editAnimals).filter((v) => v > 0).length
                : animalCount}
            </Text>
            <Text style={styles.statLabel}>{t('profile.animals')}</Text>
          </View>
        </View>

        {/* ── Crops Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="eco" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('profile.cropsGrown')}</Text>
          </View>

          {isEditing ? (
            <View>
              {/* Edit: toggle chips */}
              <View style={styles.chipContainer}>
                {availableCrops.map((crop) => {
                  const selected = editCrops.includes(crop.key);
                  return (
                    <TouchableOpacity
                      key={crop.key}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => toggleCrop(crop.key)}
                    >
                      <Text style={styles.chipEmoji}>{crop.emoji}</Text>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {crop.key}
                      </Text>
                      {selected && (
                        <MaterialIcons name="check" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Crop Inline Input */}
              <View style={styles.customInputRow}>
                <TextInput
                  style={styles.customTextInput}
                  value={customCropText}
                  onChangeText={setCustomCropText}
                  placeholder="Add custom crop (e.g. Tomato)"
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={handleAddCustomCrop}
                />
                <TouchableOpacity
                  style={styles.customAddButton}
                  onPress={handleAddCustomCrop}
                >
                  <MaterialIcons name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // View: emoji image cards
            <View style={styles.cardGrid}>
              {viewCrops.length === 0 ? (
                <Text style={styles.emptyText}>No crops added yet. Tap Edit Profile to add.</Text>
              ) : (
                viewCrops.map((cropKey) => {
                  const crop = ALL_CROPS.find((c) => c.key === cropKey) || { emoji: '🌱', key: cropKey };
                  return <EmojiCard key={cropKey} emoji={crop.emoji} label={cropKey} />;
                })
              )}
            </View>
          )}
        </View>

        {/* ── Animals Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="pets" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('profile.domesticAnimals')}</Text>
          </View>

          {isEditing ? (
            // Edit: +/- counters with emoji
            <View style={styles.animalGrid}>
              {ANIMALS.map((animal) => {
                const count = editAnimals[animal.key] || 0;
                return (
                  <View key={animal.key} style={styles.animalCard}>
                    <Text style={styles.animalEmoji}>{animal.emoji}</Text>
                    <Text style={styles.animalLabel}>{animal.label}</Text>
                    <View style={styles.animalCounter}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => handleAnimalCount(animal.key, -1)}
                      >
                        <MaterialIcons name="remove" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{count}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => handleAnimalCount(animal.key, 1)}
                      >
                        <MaterialIcons name="add" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            // View: emoji image cards with count badge
            <View style={styles.cardGrid}>
              {Object.entries(viewAnimals)
                .filter(([, count]) => count > 0)
                .map(([key, count]) => {
                  const animal = ANIMALS.find((a) => a.key === key) || { emoji: '🐾', key };
                  return (
                    <EmojiCard key={key} emoji={animal.emoji} label={animal.label} count={count} />
                  );
                })}
              {Object.values(viewAnimals).filter((v) => v > 0).length === 0 && (
                <Text style={styles.emptyText}>
                  No animals added yet. Tap Edit Profile to add.
                </Text>
              )}
            </View>
          )}
        </View>

        {/* ── Equipment Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="construction" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('profile.farmEquipment')}</Text>
          </View>

          {isEditing ? (
            <View>
              {/* Edit: toggle chips */}
              <View style={styles.chipContainer}>
                {availableEquipment.map((eq) => {
                  const selected = editEquipment.includes(eq.key);
                  return (
                    <TouchableOpacity
                      key={eq.key}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => toggleEquipment(eq.key)}
                    >
                      <Text style={styles.chipEmoji}>{eq.emoji}</Text>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {eq.key}
                      </Text>
                      {selected && (
                        <MaterialIcons name="check" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Equipment Inline Input */}
              <View style={styles.customInputRow}>
                <TextInput
                  style={styles.customTextInput}
                  value={customEquipmentText}
                  onChangeText={setCustomEquipmentText}
                  placeholder="Add custom tool (e.g. Spade)"
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={handleAddCustomEquipment}
                />
                <TouchableOpacity
                  style={styles.customAddButton}
                  onPress={handleAddCustomEquipment}
                >
                  <MaterialIcons name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // View: emoji image cards
            <View style={styles.cardGrid}>
              {viewEquipment.length === 0 ? (
                <Text style={styles.emptyText}>No equipment added yet. Tap Edit Profile to add.</Text>
              ) : (
                viewEquipment.map((eqKey) => {
                  const eq = ALL_EQUIPMENT.find((e) => e.key === eqKey) || { emoji: '⚙️', key: eqKey };
                  return <EmojiCard key={eqKey} emoji={eq.emoji} label={eqKey} />;
                })
              )}
            </View>
          )}
        </View>

        {/* ── Matching Radius Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="my-location" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('profile.matchingRadiusTitle')}</Text>
          </View>

          {isEditing ? (
            <View>
              <Text style={styles.radiusLabel}>{t('profile.matchingRadiusLabel')}</Text>
              <View style={styles.radiusChipContainer}>
                {RADIUS_OPTIONS.map((km) => {
                  const isSelected = editMatchingRadius === km;
                  const isDefault = km === DEFAULT_RADIUS;
                  return (
                    <TouchableOpacity
                      key={km}
                      style={[
                        styles.radiusChip,
                        isSelected && styles.radiusChipSelected,
                      ]}
                      onPress={() => setEditMatchingRadius(km)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.radiusChipText,
                          isSelected && styles.radiusChipTextSelected,
                        ]}
                      >
                        {km} {t('profile.matchingRadiusKm')}
                      </Text>
                      {isDefault && (
                        <View style={[styles.radiusDefaultBadge, isSelected && styles.radiusDefaultBadgeSelected]}>
                          <Text style={[styles.radiusDefaultBadgeText, isSelected && styles.radiusDefaultBadgeTextSelected]}>
                            {t('profile.defaultRadius')}
                          </Text>
                        </View>
                      )}
                      {isSelected && (
                        <MaterialIcons name="check-circle" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.radiusViewRow}>
              <View style={styles.radiusViewIconBox}>
                <MaterialIcons name="radar" size={28} color={colors.primary} />
              </View>
              <View style={styles.radiusViewTextBox}>
                <Text style={styles.radiusViewValue}>
                  {user?.matchingRadius ?? DEFAULT_RADIUS} {t('profile.matchingRadiusKm')}
                </Text>
                <Text style={styles.radiusViewSubtext}>{t('profile.matchingRadiusLabel')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Edit / Save Buttons ── */}
        {isEditing ? (
          <View style={styles.editActionRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleEditToggle}>
              <MaterialIcons name="close" size={22} color={colors.primary} />
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <CustomLoader size={24} color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="check" size={22} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditToggle}
            >
              <MaterialIcons name="edit" size={24} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: '#FFFFFF', marginTop: 12, borderWidth: 2, borderColor: colors.primary }]}
              onPress={() => navigation.navigate('FarmerHistory')}
            >
              <MaterialIcons name="history" size={26} color={colors.primary} />
              <Text style={[styles.editButtonText, { color: colors.primary, fontSize: 18 }]}>My Bookings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: '#FFFFFF', marginTop: 12, borderWidth: 2, borderColor: colors.primary }]}
              onPress={() => navigation.navigate('DisputeHistory')}
            >
              <MaterialIcons name="gavel" size={26} color={colors.primary} />
              <Text style={[styles.editButtonText, { color: colors.primary, fontSize: 18 }]}>Disputes History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: '#FFFFFF', marginTop: 12, borderWidth: 2, borderColor: colors.primary }]}
              onPress={() => navigation.navigate('SupportAndLegal')}
            >
              <MaterialIcons name="info-outline" size={26} color={colors.primary} />
              <Text style={[styles.editButtonText, { color: colors.primary, fontSize: 18 }]}>Support & Legal</Text>
            </TouchableOpacity>


            {/* Defer heavy off-screen elements (switchers, logouts) by 150ms for performance */}
            {isReady && (
              <>
                {/* Role Switcher (Slide to Switch) */}
                <View style={styles.roleSwitchCard}>
                  <LinearGradient colors={['#FACC15', '#EAB308']} style={styles.roleSwitchGradient}>
                    {/* Background Text */}
                    <View style={styles.slideTrackTextContainer}>
                      <Text style={styles.slideTrackText}>Slide to Switch to Labour Mode</Text>
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
                        <MaterialIcons name="engineering" size={28} color="#EAB308" />
                      </LinearGradient>
                    </Animated.View>
                  </LinearGradient>
                </View>

                {/* Notifications Button */}
                <TouchableOpacity
                  style={styles.notificationsButton}
                  onPress={() => navigation.navigate('Notifications')}
                >
                  <MaterialIcons name="notifications-none" size={22} color={colors.primary} />
                  <Text style={styles.notificationsButtonText}>{t('notifications.title')}</Text>
                </TouchableOpacity>

                {/* Soft Red Logout Button */}
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to logout?')) {
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
                  <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
                </TouchableOpacity>

                {/* App Version */}
                <Text style={styles.versionText}>Version {appVersion}</Text>
              </>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomNavBar role="farmer" activeTab="Profile" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundLight },
  content: { flex: 1 },
  contentContainer: { paddingBottom: 120 },

  // Custom Header Styles
  header: {
    height: Platform.OS === 'ios' ? 110 : 90,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  langToggleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langToggleText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginTop: -20,
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
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.primary}1A`,
    borderWidth: 4,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePhoto: {
    width: 112,
    height: 112,
    borderRadius: 56,
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
  avatarPicker: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  avatarPickerTitle: { fontSize: 14, fontWeight: '600', color: '#6f8961', marginBottom: 12 },
  avatarPickerRow: { flexDirection: 'row', gap: 12 },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${colors.primary}33`,
  },
  avatarOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },

  name: { fontSize: 32, fontWeight: 'bold', color: '#131811', marginBottom: 4 },
  nameInput: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#131811',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 4,
    textAlign: 'center',
    minWidth: 200,
  },
  phone: { fontSize: 18, color: '#6f8961', marginBottom: 4 },
  village: { fontSize: 16, color: '#9CA3AF' },
  villageInput: {
    fontSize: 14,
    color: '#131811',
    borderBottomWidth: 1,
    borderBottomColor: `${colors.primary}66`,
    paddingVertical: 4,
    paddingHorizontal: 8,
    textAlign: 'center',
    minWidth: 180,
  },

  // Stats
  statsSection: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 24 },
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
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#131811' },
  statInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
    width: 60,
    padding: 0,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    textAlign: 'center',
  },
  statLabel: { fontSize: 14, color: '#6f8961', textAlign: 'center' },

  // Section
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#131811' },

  // View mode: card grid
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },

  // Edit mode: chip toggles
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.primary}1A`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 15, fontWeight: '700', color: '#131811' },
  chipTextSelected: { color: '#FFFFFF' },

  // Inline Custom Input Row Styles
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  customTextInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customAddButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  // Edit mode: animal counters
  animalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  animalCard: {
    width: '30%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
    marginBottom: 4,
  },
  animalEmoji: { fontSize: 30, marginBottom: 4 },
  animalLabel: { fontSize: 13, fontWeight: '700', color: '#131811', marginBottom: 8, textAlign: 'center' },
  animalCounter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  counterBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
  },
  counterValue: { fontSize: 15, fontWeight: 'bold', color: '#131811', minWidth: 18, textAlign: 'center' },

  emptyText: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },

  // Matching Radius
  radiusLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  radiusChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  radiusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1.5,
    borderColor: `${colors.primary}33`,
  },
  radiusChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  radiusChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  radiusChipTextSelected: {
    color: '#FFFFFF',
  },
  radiusDefaultBadge: {
    marginLeft: 6,
    backgroundColor: `${colors.primary}22`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  radiusDefaultBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  radiusDefaultBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  radiusDefaultBadgeTextSelected: {
    color: '#FFFFFF',
  },
  radiusViewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}08`,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}18`,
  },
  radiusViewIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radiusViewTextBox: {
    flex: 1,
  },
  radiusViewValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#131811',
  },
  radiusViewSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  // Buttons
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
  editButtonText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  editActionRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 24 },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  notificationsButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#F0FDF4',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
  },
  notificationsButtonText: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  logoutButton: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  logoutButtonText: { fontSize: 16, fontWeight: 'bold', color: '#EF4444' },
  versionText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 20 },
  roleSwitchCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#EAB308',
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
    color: 'rgba(255,255,255,0.6)',
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
  arrowContainer: {},
});

export default FarmerProfileScreen;
