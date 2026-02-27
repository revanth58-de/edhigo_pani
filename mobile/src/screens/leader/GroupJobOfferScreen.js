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
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <MaterialIcons name={getWorkIcon(job.workType)} size={48} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>{job.workType.toUpperCase()}</Text>
        <Text style={styles.headerSubtitle}>{job.distance} Away</Text>
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
          <MaterialIcons name="close" size={32} color="#FFFFFF" />
          <Text style={styles.buttonText}>REJECT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAccept}
          activeOpacity={0.8}
        >
          <MaterialIcons name="check" size={32} color={colors.backgroundDark} />
          <Text style={styles.buttonText}>ACCEPT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundLight },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: colors.backgroundDark },
  headerSubtitle: { fontSize: 16, color: colors.backgroundDark, opacity: 0.8 },
  content: { flex: 1, padding: 20 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', height: '100%' },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    elevation: 2,
  },
  locationText: { fontSize: 16, color: '#374151', flex: 1 },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 8,
    backgroundColor: `${colors.primary}1A`,
    padding: 12,
    borderRadius: 99,
    alignSelf: 'center',
  },
  voiceText: { color: colors.primary, fontWeight: 'bold' },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 40,
    gap: 12,
    backgroundColor: '#FFF'
  },
  rejectButton: {
    flex: 1,
    height: 70,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
  },
  acceptButton: {
    flex: 1,
    height: 70,
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
  },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
});

export default GroupJobOfferScreen;
