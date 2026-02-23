// Screen 17: Worker Home - Exact match to worker-home.html
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import TopBar from '../../components/TopBar';
import BottomNavBar from '../../components/BottomNavBar';
import { jobAPI } from '../../services/api';

const WorkerHomeScreen = ({ navigation }) => {
  const { user, logout, isVoiceEnabled } = useAuthStore();
  const [isOnline, setIsOnline] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (isVoiceEnabled) {
      Speech.speak('Pani start cheyyandi', { language: 'te' });
    }
  }, [isVoiceEnabled]);

  const handleStartWork = async () => {
    setSearching(true);
    if (isVoiceEnabled) {
      Speech.speak('Looking for jobs near you', { language: 'en' });
    }
    try {
      const response = await jobAPI.getJobs({ status: 'pending' });
      const jobs = response?.data?.data || [];
      if (jobs.length === 0) {
        if (isVoiceEnabled) {
          Speech.speak('No jobs found nearby. Try again later.', { language: 'en' });
        }
        Alert.alert('No Jobs', 'No pending jobs found near you. Please try again later.');
        return;
      }
      // Take the first available pending job
      const job = jobs[0];
      if (isVoiceEnabled) {
        Speech.speak('Job found! Review the details.', { language: 'en' });
      }
      navigation.navigate('JobOffer', { job });
    } catch (error) {
      console.error('Fetch jobs error:', error);
      Alert.alert('Error', 'Could not fetch jobs. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const toggleOnlineStatus = (value) => {
    setIsOnline(value);
    if (isVoiceEnabled) {
      Speech.speak(value ? 'You are now online' : 'You are now offline', {
        language: 'en',
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Bar */}
      <TopBar title="Worker Home" navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Text style={styles.greetingText}>Namaste, {user?.name || 'Ramesh'}</Text>
          <Text style={styles.subText}>Ready to earn today?</Text>
        </View>

        {/* Voice Prompt */}
        <View style={styles.voicePrompt}>
          <View style={styles.voicePromptInner}>
            <MaterialIcons name="volume-up" size={36} color={colors.primary} />
            <Text style={styles.voicePromptText}>Pani start cheyyandi</Text>
          </View>
          <Text style={styles.voiceHint}>TAP THE BUTTON BELOW</Text>
        </View>

        {/* Massive START WORK Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.startButton, (!isOnline || searching) && { opacity: 0.7 }]}
            activeOpacity={0.9}
            onPress={handleStartWork}
            disabled={!isOnline || searching}
          >
            {searching ? (
              <>
                <ActivityIndicator color={colors.backgroundDark} size="large" />
                <Text style={styles.startButtonText}>SEARCHING...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="play-arrow" size={72} color={colors.backgroundDark} />
                <Text style={styles.startButtonText}>START WORK</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIconCircle}>
              <MaterialIcons name="support-agent" size={30} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>Help</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIconCircle}>
              <MaterialIcons name="account-balance-wallet" size={30} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>Earnings</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            if (global.window && global.window.confirm) {
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
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar role="worker" activeTab="Home" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
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
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
    flex: 1,
    marginLeft: 8,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}33`,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 8,
  },
  onlineDot: {
    width: 12,
    height: 12,
    position: 'relative',
  },
  onlinePing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    opacity: 0.75,
  },
  onlineDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  onlineText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131811',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  profileHeader: {
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#131811',
    textAlign: 'center',
  },
  subText: {
    fontSize: 18,
    color: '#6f8961',
    marginTop: 4,
    textAlign: 'center',
  },
  voicePrompt: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 8,
    alignItems: 'center',
  },
  voicePromptInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  voicePromptText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131811',
  },
  voiceHint: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6f8961',
    letterSpacing: 2,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  startButton: {
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 8,
    borderColor: '#FFFFFF',
  },
  startButtonText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.backgroundDark,
    marginTop: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIconCircle: {
    backgroundColor: '#F2F4F0',
    padding: 16,
    borderRadius: 9999,
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131811',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6f8961',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  navTextActive: {
    color: colors.primary,
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
});

export default WorkerHomeScreen;
