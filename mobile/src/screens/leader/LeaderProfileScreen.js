// Leader Profile Screen - with logout button
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import BottomNavBar from '../../components/BottomNavBar';

const LeaderProfileScreen = ({ navigation }) => {
  // Use explicit selectors to avoid stale closures in Zustand
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useAuthStore((state) => state.updateUser);
  const language = useAuthStore((state) => state.language) || 'en';
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editName, setEditName] = React.useState(user?.name || '');
  const [editVillage, setEditVillage] = React.useState(user?.village || '');
  const [editSkills, setEditSkills] = React.useState(
    typeof user?.skills === 'string' ? JSON.parse(user.skills) : (user?.skills || [])
  );

  const ALL_SKILLS = ['Team Management', 'Harvesting', 'Sowing', 'Irrigation', 'Tractor Driving', 'Logistics', 'Quality Control'];

  const toggleSkill = (skill) => {
    if (editSkills.includes(skill)) {
      setEditSkills(editSkills.filter(s => s !== skill));
    } else {
      setEditSkills([...editSkills, skill]);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditName(user?.name || '');
      setEditVillage(user?.village || '');
      setEditSkills(typeof user?.skills === 'string' ? JSON.parse(user.skills) : (user?.skills || []));
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUser({
        name: editName,
        village: editVillage,
        skills: JSON.stringify(editSkills),
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
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
  };


  const stats = [
    { label: 'Groups Led', value: '3', icon: 'groups' },
    { label: 'Rating', value: `${(user?.ratingAvg || 0).toFixed(1)}`, icon: 'star' },
    { label: 'Jobs Done', value: '12', icon: 'work' },
  ];

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
              <MaterialIcons name="emoji-people" size={64} color={colors.backgroundDark} />
            </View>
            <View style={styles.leaderBadge}>
              <MaterialIcons name="star" size={14} color="#FFCC00" />
              <Text style={styles.leaderBadgeText}>LEADER</Text>
            </View>
          </View>
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Name"
            />
          ) : (
            <Text style={styles.name}>{user?.name || 'Leader'}</Text>
          )}
          <Text style={styles.phone}>{user?.phone || ''}</Text>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={16} color={colors.primary} />
            {isEditing ? (
              <TextInput
                style={styles.villageInput}
                value={editVillage}
                onChangeText={setEditVillage}
                placeholder="Village"
              />
            ) : (
              <Text style={styles.location}>{user?.village || 'Location not set'}</Text>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <MaterialIcons name={s.icon} size={28} color={colors.primary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={20} color={colors.primary} />
            <Text style={styles.infoText}>{user?.phone || 'Not set'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="language" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              {user?.language === 'te' ? 'Telugu' : user?.language === 'hi' ? 'Hindi' : 'English'}
            </Text>
          </View>
        </View>


        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleEditToggle} disabled={isSaving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={handleEditToggle}>
              <MaterialIcons name="edit" size={20} color={colors.primary} />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={22} color="#FFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>

      <BottomNavBar role="leader" activeTab="Profile" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.primary,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.backgroundDark, flex: 1, textAlign: 'center' },
  content: { flex: 1 },
  contentContainer: { paddingBottom: 120, paddingHorizontal: 16, paddingTop: 20 },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
  },
  avatarContainer: { alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}22`,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: -4,
  },
  leaderBadgeText: { fontSize: 11, fontWeight: 'bold', color: colors.backgroundDark },
  name: { fontSize: 24, fontWeight: 'bold', color: '#131811', marginBottom: 4 },
  phone: { fontSize: 15, color: '#6f8961', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontSize: 14, color: '#6f8961' },
  nameInput: { fontSize: 20, fontWeight: 'bold', color: '#131811', borderBottomWidth: 1, borderBottomColor: colors.primary, marginBottom: 4, textAlign: 'center', width: '100%' },
  villageInput: { fontSize: 14, color: '#131811', borderBottomWidth: 1, borderBottomColor: colors.primary, textAlign: 'center', minWidth: 100 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#131811' },
  statLabel: { fontSize: 11, color: '#6f8961', textAlign: 'center' },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoText: { fontSize: 15, color: '#374151', flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 14, borderWidth: 2, borderColor: colors.primary },
  editBtnText: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: 'bold', color: '#6B7280' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutText: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
});

export default LeaderProfileScreen;
