// Screen 29: Group Attendance Confirmed - Leader group checked in
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors } from '../../theme/colors';

const GroupAttendanceConfirmedScreen = ({ navigation, route }) => {
  const { job, groupName, memberCount } = route.params;

  useEffect(() => {
    Speech.speak('Group attendance confirmed! Work started.', { language: 'en' });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="check-circle" size={120} color={colors.primary} />
        </View>

        <Text style={styles.title}>Group Checked In!</Text>
        <Text style={styles.subtitle}>గ్రూప్ హాజరు అయింది</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="groups" size={24} color={colors.primary} />
            <Text style={styles.infoLabel}>Group:</Text>
            <Text style={styles.infoValue}>{groupName}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <MaterialIcons name="people" size={24} color={colors.primary} />
            <Text style={styles.infoLabel}>Members:</Text>
            <Text style={styles.infoValue}>{memberCount}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <MaterialIcons name="schedule" size={24} color={colors.primary} />
            <Text style={styles.infoLabel}>Started:</Text>
            <Text style={styles.infoValue}>
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <View style={styles.voiceHint}>
          <MaterialIcons name="volume-up" size={20} color={colors.primary} />
          <Text style={styles.voiceText}>Work has started for your group</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate('LeaderHome')}
          activeOpacity={0.9}
        >
          <Text style={styles.continueButtonText}>DONE</Text>
          <MaterialIcons name="check" size={24} color={colors.backgroundDark} />
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
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
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    backgroundColor: `${colors.primary}0D`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  voiceText: {
    fontSize: 14,
    color: '#6f8961',
    fontWeight: '500',
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

export default GroupAttendanceConfirmedScreen;
