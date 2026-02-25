// Screen 7: Farmer Profile - Fully editable with image-based view mode
import React, { useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../services/api';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';

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
  { key: 'Rice', emoji: '🌾' },
  { key: 'Wheat', emoji: '🌿' },
  { key: 'Cotton', emoji: '🌱' },
  { key: 'Maize', emoji: '🌽' },
  { key: 'Sugarcane', emoji: '🎋' },
  { key: 'Soybean', emoji: '🫘' },
  { key: 'Groundnut', emoji: '🥜' },
  { key: 'Turmeric', emoji: '🟡' },
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
  try { return JSON.parse(str); } catch { return {}; }
};
const stringifyAnimals = (obj) =>
  JSON.stringify(Object.fromEntries(Object.entries(obj).filter(([, v]) => v > 0)));

const parseCrops = (str) => {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return str.split(',').map(s => s.trim()); }
};
const stringifyCrops = (arr) => JSON.stringify(arr);

const parseEquipment = (str) => {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return str.split(',').map(s => s.trim()); }
};
const stringifyEquipment = (arr) => JSON.stringify(arr);

// ─── Sub-components ───

// Image-style card for view mode
const EmojiCard = ({ emoji, label, count }) => (
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
);

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
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Editable state
  const [editName, setEditName] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editLandAcres, setEditLandAcres] = useState('');
  const [editAnimals, setEditAnimals] = useState({});
  const [editCrops, setEditCrops] = useState([]);
  const [editEquipment, setEditEquipment] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState('agriculture');

  // View mode data (from user store)
  const viewAnimals = parseAnimals(user?.animals);
  const viewCrops = parseCrops(user?.crops);
  const viewEquipment = parseEquipment(user?.equipment);
  const viewLand = user?.landAcres ? `${user.landAcres} Acres` : '—';

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditName(user?.name || '');
      setEditVillage(user?.village || '');
      setEditLandAcres(user?.landAcres ? String(user.landAcres) : '');
      setEditAnimals(parseAnimals(user?.animals));
      setEditCrops(parseCrops(user?.crops));
      setEditEquipment(parseEquipment(user?.equipment));
      setSelectedAvatar(user?.avatarIcon || 'agriculture');
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
    setEditCrops((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const toggleEquipment = (key) => {
    setEditEquipment((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
    );
  };

  const animalCount = Object.values(viewAnimals).filter((v) => v > 0).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <TopBar title="Farm Profile" showBack navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>

        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <MaterialIcons
                name={isEditing ? selectedAvatar : (user?.avatarIcon || 'agriculture')}
                size={60}
                color={colors.primary}
              />
            </View>
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={() => setShowAvatarPicker(!showAvatarPicker)}
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
            <Text style={styles.name}>{user?.name || '—'}</Text>
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
            <Text style={styles.statLabel}>Total Land</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="grass" size={32} color={colors.primary} />
            <Text style={styles.statValue}>{isEditing ? editCrops.length : viewCrops.length}</Text>
            <Text style={styles.statLabel}>Crops</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="pets" size={32} color={colors.primary} />
            <Text style={styles.statValue}>
              {isEditing
                ? Object.values(editAnimals).filter((v) => v > 0).length
                : animalCount}
            </Text>
            <Text style={styles.statLabel}>Animals</Text>
          </View>
        </View>

        {/* ── Crops Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="eco" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Crops Grown</Text>
          </View>

          {isEditing ? (
            // Edit: toggle chips
            <View style={styles.chipContainer}>
              {ALL_CROPS.map((crop) => {
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
                      <MaterialIcons name="check" size={14} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
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
            <Text style={styles.sectionTitle}>Domestic Animals</Text>
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
            <Text style={styles.sectionTitle}>Farm Equipment</Text>
          </View>

          {isEditing ? (
            // Edit: toggle chips
            <View style={styles.chipContainer}>
              {ALL_EQUIPMENT.map((eq) => {
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
                      <MaterialIcons name="check" size={14} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
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

        {/* ── Edit / Save Buttons ── */}
        {isEditing ? (
          <View style={styles.editActionRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleEditToggle}>
              <MaterialIcons name="close" size={22} color={colors.primary} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
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
              <MaterialIcons name="history" size={24} color={colors.primary} />
              <Text style={[styles.editButtonText, { color: colors.primary }]}>Work History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                if (Platform.OS === 'web') {
                  // Alert.alert doesn't work on web
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

  // Profile Card
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

  name: { fontSize: 28, fontWeight: 'bold', color: '#131811', marginBottom: 4 },
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
  phone: { fontSize: 16, color: '#6f8961', marginBottom: 4 },
  village: { fontSize: 14, color: '#9CA3AF' },
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
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#131811' },
  statInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 4,
    textAlign: 'center',
    minWidth: 50,
  },
  statLabel: { fontSize: 12, color: '#6f8961', textAlign: 'center' },

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
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#131811' },

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
  chipText: { fontSize: 13, fontWeight: '600', color: '#131811' },
  chipTextSelected: { color: '#FFFFFF' },

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
  animalLabel: { fontSize: 11, fontWeight: '600', color: '#131811', marginBottom: 8, textAlign: 'center' },
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
});

export default FarmerProfileScreen;
