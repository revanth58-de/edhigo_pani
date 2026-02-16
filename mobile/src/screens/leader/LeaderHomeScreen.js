// Screen 25: Leader Home - Exact match to leader-home-start-group.html
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

const LeaderHomeScreen = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    Speech.speak('Group leader home. Create a new group to start.', { language: 'en' });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <TopBar title="Group Leader" navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <MaterialIcons name="emoji-people" size={64} color={colors.primary} />
          <Text style={styles.welcomeTitle}>Namaste, {user?.name || 'Leader'}!</Text>
          <Text style={styles.welcomeSubtitle}>Ready to lead your group?</Text>
        </View>

        {/* Voice Prompt */}
        <View style={styles.voicePrompt}>
          <MaterialIcons name="volume-up" size={32} color={colors.primary} />
          <Text style={styles.voicePromptText}>గ్రూప్ start చేయండి</Text>
        </View>

        {/* Main Action - Start Group */}
        <TouchableOpacity
          style={styles.startGroupButton}
          onPress={() => navigation.navigate('GroupSetup')}
          activeOpacity={0.9}
        >
          <View style={styles.startGroupIcon}>
            <MaterialIcons name="group-add" size={64} color={colors.backgroundDark} />
          </View>
          <Text style={styles.startGroupText}>START NEW GROUP</Text>
          <Text style={styles.startGroupSubtext}>Tap to create a group and find work</Text>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="groups" size={32} color={colors.primary} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Active Groups</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="work" size={32} color={colors.primary} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.helpCard}>
          <MaterialIcons name="info" size={24} color={colors.primary} />
          <View style={styles.helpText}>
            <Text style={styles.helpTitle}>How it works</Text>
            <Text style={styles.helpDescription}>
              1. Create a group{'\n'}
              2. Add workers{'\n'}
              3. Find jobs together{'\n'}
              4. Earn more!
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar role="leader" activeTab="Home" />
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}33`,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
    flex: 1,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
    paddingHorizontal: 16,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#131811',
    marginTop: 16,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6f8961',
    marginTop: 8,
    textAlign: 'center',
  },
  voicePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: `${colors.primary}1A`,
    padding: 16,
    borderRadius: 24,
    marginTop: 24,
  },
  voicePromptText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
  },
  startGroupButton: {
    backgroundColor: colors.primary,
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  startGroupIcon: {
    marginBottom: 16,
  },
  startGroupText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.backgroundDark,
    marginBottom: 8,
  },
  startGroupSubtext: {
    fontSize: 14,
    color: colors.backgroundDark,
    opacity: 0.8,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#131811',
  },
  statLabel: {
    fontSize: 12,
    color: '#6f8961',
    textAlign: 'center',
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  helpText: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 8,
  },
  helpDescription: {
    fontSize: 14,
    color: '#6f8961',
    lineHeight: 22,
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

export default LeaderHomeScreen;
