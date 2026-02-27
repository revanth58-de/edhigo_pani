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
  const language = useAuthStore((state) => state.language) || 'en';
  const { t } = useTranslation();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-undef
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
          <Text style={styles.name}>{user?.name || 'Leader'}</Text>
          <Text style={styles.phone}>{user?.phone || ''}</Text>
          {user?.village && (
            <View style={styles.locationRow}>
              <MaterialIcons name="location-on" size={16} color={colors.primary} />
              <Text style={styles.location}>{user.village}</Text>
            </View>
          )}
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
          <Text style={styles.sectionTitle}>Details</Text>
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
          <View style={styles.infoRow}>
            <MaterialIcons name="badge" size={20} color={colors.primary} />
            <Text style={styles.infoText}>Role: Group Leader</Text>
          </View>
        </View>

        {/* Skills */}
        {user?.skills && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsWrap}>
              {(typeof user.skills === 'string'
                ? JSON.parse(user.skills)
                : user.skills
              ).map((skill, i) => (
                <View key={i} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={22} color="#FFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App version */}
        <Text style={styles.version}>Edhigo Pani v1.0.0</Text>
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
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#131811', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoText: { fontSize: 15, color: '#374151', flex: 1 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillTag: { backgroundColor: `${colors.primary}1A`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  skillText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
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
  version: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});

export default LeaderProfileScreen;
