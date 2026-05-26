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
import { LinearGradient } from 'expo-linear-gradient';
import { authAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';

const RoleSelectionScreen = ({ navigation }) => {
  const { user, refreshProfile, setRole } = useAuthStore();
  const { t } = useTranslation();

  const handleRoleSelect = async (role) => {
    try {
      await setRole(role);
      await refreshProfile();
      // Reactive navigation will be triggered automatically by AppNavigator when user.role changes
    } catch (error) {
      Alert.alert('Error', 'Failed to set role. Please try again.');
    }
  };

  const roles = [
    {
      id: 'farmer',
      name: t('auth.iAmFarmer') || 'I am a Farmer',
      icon: 'agriculture',
      description: 'Find skilled labour for your farm.',
      gradient: [colors.primary, colors.primaryDark],
    },
    {
      id: 'worker',
      name: t('auth.iAmWorker') || 'I am a Worker',
      icon: 'engineering',
      description: 'Find jobs and earn daily wages.',
      gradient: [colors.secondary, colors.secondaryGradient[1]],
    },
    {
      id: 'leader',
      name: t('auth.iAmLeader') || 'I am a Leader',
      icon: 'groups',
      description: 'Manage groups and take bulk jobs.',
      gradient: [colors.accent, '#D49B00'],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={styles.header}>
        <Text style={styles.title}>Join Dinasari as a...</Text>
        <Text style={styles.subtitle}>Choose the role that best fits you</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => handleRoleSelect(role.id)}
          >
            <LinearGradient colors={role.gradient} style={styles.cardGradient}>
              <View style={styles.iconCircle}>
                <MaterialIcons name={role.icon} size={40} color="#FFF" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.roleName}>{role.name}</Text>
                <Text style={styles.roleDesc}>{role.description}</Text>
              </View>
              <View style={styles.arrowCircle}>
                <MaterialIcons name="chevron-right" size={24} color="#FFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>You can change your role later in settings</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
  },
  content: {
    paddingHorizontal: 24,
    gap: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  cardInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  roleDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    lineHeight: 20,
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

export default RoleSelectionScreen;
