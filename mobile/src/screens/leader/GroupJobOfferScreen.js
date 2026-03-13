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
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';

const GroupJobOfferScreen = ({ navigation, route }) => {
  const { groupId, jobData, workerCount } = route.params || {};
  const { t } = useTranslation();

  // Example job data if none provided via route
  const job = jobData || {
    workType: 'Harvesting',
    distance: '1.2 km',
    workerCount: workerCount || 15,
    pay: 500,
    farmAddress: 'Mylavaram Road',
  };

  useEffect(() => {
    playVoicePrompt();
  }, []);

  const playVoicePrompt = () => {
    const message = "Pani request vachindi"; // "Work request received" in Telugu would be better if needed, but following prompt exactly.
    Speech.speak(message, { language: 'te' });
  };

  const handleAccept = () => {
    navigation.navigate('GroupNavigation', { job, groupId });
  };

  const handleReject = () => {
    navigation.goBack();
  };

  const getWorkIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'harvesting': return 'agriculture';
      case 'sowing': return 'grass';
      case 'irrigation': return 'water-drop';
      default: return 'work';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.header}>
        <LinearGradient
          colors={colors.primaryGradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <View style={styles.iconCircle}>
            <MaterialIcons name={getWorkIcon(job.workType)} size={42} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>{job.workType?.toUpperCase()}</Text>
          <View style={styles.distanceBadge}>
            <MaterialIcons name="navigation" size={14} color="#FFFFFF" />
            <Text style={styles.distanceText}>{job.distance} AWAY</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Workers Required</Text>
            <View style={styles.statValueRow}>
              <MaterialIcons name="groups" size={24} color={colors.primary} />
              <Text style={styles.statValue}>{job.workerCount}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Wage Offer</Text>
            <Text style={styles.statValue}>₹{job.pay}/day</Text>
          </View>
        </View>

        <View style={styles.locationCard}>
          <MaterialIcons name="location-on" size={24} color={colors.primary} />
          <Text style={styles.locationText}>{job.farmAddress}</Text>
        </View>

        <View style={styles.voiceIndicator}>
          <MaterialIcons name="volume-up" size={20} color={colors.primary} />
          <Text style={styles.voiceText}>"Pani request vachindi"</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={handleReject}
          activeOpacity={0.8}
        >
          <Text style={styles.rejectButtonText}>REJECT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptButtonTouchable}
          onPress={handleAccept}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={colors.primaryGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.acceptButton}
          >
            <Text style={styles.acceptButtonText}>ACCEPT JOB</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 40,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 12,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 24,
    marginTop: -40,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#131811',
  },
  statDivider: {
    width: 1.5,
    backgroundColor: '#F3F4F6',
    height: '60%',
    alignSelf: 'center',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    flex: 1,
    lineHeight: 22,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 10,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignSelf: 'center',
  },
  voiceText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  rejectButton: {
    width: 120,
    height: 64,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  rejectButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  acceptButtonTouchable: {
    flex: 1,
  },
  acceptButton: {
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default GroupJobOfferScreen;
