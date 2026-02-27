// Screen 21: Attendance Confirmed - Exact match to attendance-confirmed.html
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';

const AttendanceConfirmedScreen = ({ navigation, route }) => {
  const { job } = route.params || {};
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';

  useEffect(() => {

    // Auto-navigate after 3 seconds
    const timer = setTimeout(() => {
      navigation.navigate('WorkStatus', { job });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Success Animation Container */}
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <MaterialIcons name="check-circle" size={120} color={colors.primary} />
        </View>

        <Text style={styles.title}>Attendance Confirmed!</Text>
        <Text style={styles.subtitle}>హాజరు నమోదు అయింది</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="schedule" size={24} color={colors.primary} />
            <Text style={styles.infoLabel}>Check-in Time:</Text>
            <Text style={styles.infoValue}>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="work" size={24} color={colors.primary} />
            <Text style={styles.infoLabel}>Work Type:</Text>
            <Text style={styles.infoValue}>{job?.workType || 'Harvesting'}</Text>
          </View>
        </View>

        <Text style={styles.helperText}>Starting your work now...</Text>
      </View>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate('WorkStatus', { job })}
          activeOpacity={0.9}
        >
          <Text style={styles.continueButtonText}>CONTINUE</Text>
          <MaterialIcons name="arrow-forward" size={24} color={colors.backgroundDark} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#131811',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    color: '#6f8961',
    textAlign: 'center',
    marginBottom: 48,
  },
  infoCard: {
    width: '100%',
    backgroundColor: `${colors.primary}0D`,
    borderRadius: 24,
    padding: 24,
    gap: 20,
    borderWidth: 2,
    borderColor: `${colors.primary}33`,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#6f8961',
    flex: 1,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
  },
  helperText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 32,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  continueButton: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.backgroundDark,
  },
});

export default AttendanceConfirmedScreen;
