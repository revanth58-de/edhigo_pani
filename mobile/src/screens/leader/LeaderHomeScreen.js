import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import BottomNavBar from '../../components/BottomNavBar';
import WeatherLocationHeader from '../../components/WeatherLocationHeader';
import GlassCard from '../../components/GlassCard';
import { socketService } from '../../services/socketService';

const LeaderHomeScreen = ({ navigation, route }) => {
  const { user, refreshProfile } = useAuthStore();
  const { t } = useTranslation();
  const activeTab = route.params?.tab || 'home';

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  useEffect(() => {
    if (user?.id) {
      socketService.connect();
      socketService.joinUserRoom(user.id);
    }
  }, [user?.id]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Hero Section */}
        <LinearGradient 
          colors={[colors.primary, colors.primaryDark]} 
          style={styles.heroSection}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.greetingText}>
                {t('common.namaste') || 'Namaste'}, {user?.fullName?.split(' ')[0] || 'Leader'}
              </Text>
              <Text style={styles.heroSubText}>Empower your group today.</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <MaterialIcons name="notifications-none" size={24} color="#FFF" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <WeatherLocationHeader />

        {/* Main Group Actions */}
        <View style={styles.mainActions}>
          <TouchableOpacity 
            style={styles.primaryAction} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('GroupSetup')}
          >
            <LinearGradient colors={colors.primaryGradient} style={styles.actionGradient}>
              <MaterialIcons name="group-add" size={40} color="#FFF" />
              <Text style={styles.actionTitle}>CREATE GROUP</Text>
              <Text style={styles.actionSub}>Bring your team together</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryAction} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Groups')}
          >
            <MaterialIcons name="groups" size={32} color={colors.primary} />
            <Text style={styles.secondaryActionTitle}>MY GROUPS</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.statsGrid}>
            <GlassCard intensity={10} style={styles.statCard}>
              <Text style={styles.statVal}>{user?.groupsLed ?? 0}</Text>
              <Text style={styles.statLab}>Active Groups</Text>
            </GlassCard>
            <GlassCard intensity={10} style={styles.statCard}>
              <Text style={styles.statVal}>{user?.jobsDone ?? 0}</Text>
              <Text style={styles.statLab}>Jobs Completed</Text>
            </GlassCard>
          </View>
        </View>

        {/* How it works */}
        <GlassCard intensity={5} style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={24} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Guide for Leaders</Text>
            <Text style={styles.infoDesc}>
              1. Add workers to your group{'\n'}
              2. Accept high-paying bulk jobs{'\n'}
              3. Manage attendance easily
            </Text>
          </View>
        </GlassCard>
      </ScrollView>

      <BottomNavBar role="leader" activeTab={activeTab === 'history' ? 'Bookings' : 'Home'} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  heroSection: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    paddingHorizontal: 24,
    paddingBottom: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFF',
  },
  heroSubText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 6,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  mainActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 32,
    gap: 16,
  },
  primaryAction: {
    flex: 1.5,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
  },
  actionGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 12,
  },
  actionSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  secondaryAction: {
    flex: 1,
    height: 180,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    elevation: 4,
  },
  secondaryActionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  statsSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1C1E',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statVal: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
  },
  statLab: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  infoCard: {
    marginHorizontal: 24,
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(31, 138, 61, 0.1)',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  infoDesc: {
    fontSize: 17,
    color: '#64748B',
    lineHeight: 24,
  },
});

export default LeaderHomeScreen;
