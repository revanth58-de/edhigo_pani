// Screen 5: Role Selection - Exact match to role-selection.html
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { authService } from '../../services/api/authService';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { getSpeechLang, safeSpeech } from '../../utils/voiceGuidance';

const RoleSelectionScreen = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';

  useEffect(() => {
    safeSpeech(t('auth.selectRole'), { language: getSpeechLang(language) });
  }, []);

  const handleVoiceGuidance = () => {
    safeSpeech(t('voice.selectRole'), {
      language: getSpeechLang(language),
    });
  };

  const handleRoleSelect = async (role, roleName) => {
    try {
      const response = await authService.setRole(role);
      
      if (response.success) {
        // Update user role in store
        updateUser({ ...response.data, role });
        safeSpeech(`${roleName} ${t('voice.roleSelected')}`, { language: getSpeechLang(language) });
        
        // Navigation is handled by AppNavigator based on user.role
        // Just wait for state update to trigger automatic navigation
        setTimeout(() => {
          // AppNavigator will automatically show the right screen
          console.log('Role set to:', role);
        }, 500);
      } else {
        Alert.alert('Error', response.message || 'Failed to set role');
      }
    } catch (error) {
      console.error('Set Role Error:', error);
      Alert.alert('Error', 'Failed to set role. Please try again.');
    }
  };

  const roles = [
    {
      id: 'farmer',
      name: t('auth.iAmFarmer'),
      icon: 'agriculture',
      description: t('common.farmer'),
    },
    {
      id: 'worker',
      name: t('auth.iAmWorker'),
      icon: 'handyman',
      description: t('common.worker'),
    },
    {
      id: 'leader',
      name: t('auth.iAmLeader'),
      icon: 'groups',
      description: t('common.leader'),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={handleVoiceGuidance}
          activeOpacity={0.8}
        >
          <MaterialIcons name="volume-up" size={28} color={colors.backgroundDark} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('auth.selectRole')}</Text>
        <TouchableOpacity style={styles.helpButton}>
          <MaterialIcons name="help" size={28} color="#131811" />
        </TouchableOpacity>
      </View>

      {/* Headline */}
      <View style={styles.headlineContainer}>
        <Text style={styles.mainHeadline}>{t('auth.selectRole')}</Text>
        <Text style={styles.subHeadline}>{t('auth.selectRole')}</Text>
      </View>

      {/* Role Cards */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.cardsContainer}
        showsVerticalScrollIndicator={false}
      >
        {roles.map((role) => (
          <View key={role.id} style={styles.cardWrapper}>
            <TouchableOpacity
              style={styles.roleCard}
              activeOpacity={0.9}
              onPress={() => handleRoleSelect(role.id, role.name)}
            >
              <View style={styles.iconCircle}>
                <MaterialIcons name={role.icon} size={48} color={colors.primary} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.roleName}>{role.name}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </View>
              <View style={styles.selectBadge}>
                <Text style={styles.selectBadgeText}>Select</Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Safe Area Spacer */}
      <View style={{ height: 32 }} />
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
    flex: 1,
    textAlign: 'center',
  },
  helpButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headlineContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  mainHeadline: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#131811',
    textAlign: 'center',
    marginBottom: 4,
  },
  subHeadline: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6f8961',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    },
  cardsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 16,
  },
  cardWrapper: {
    padding: 8,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}1A`, // 10% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTextContainer: {
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  roleName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 16,
    color: '#6f8961',
  },
  selectBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 8,
    borderRadius: 9999,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.backgroundDark,
  },
});

export default RoleSelectionScreen;
