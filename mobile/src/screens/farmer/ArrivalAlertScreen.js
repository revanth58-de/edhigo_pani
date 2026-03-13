// Screen 11: Arrival Alert - Farmer
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

import { LinearGradient } from 'expo-linear-gradient';

const ArrivalAlertScreen = ({ navigation, route }) => {
  const { job } = route.params;
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('QRAttendance', { job, type: 'in' });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#FDFBF7', colors.backgroundLight]}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Spacer for status bar */}
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[`${colors.primary}22`, `${colors.primary}05`]}
            style={styles.iconCircle}
          >
            <MaterialIcons name="local-shipping" size={80} color={colors.primary} />
          </LinearGradient>
          <View style={styles.successBadge}>
            <MaterialIcons name="check" size={20} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Workers Arrived!</Text>
          <Text style={styles.subtitle}>కార్మికులు వచ్చేసారు</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.rowIcon}>
              <MaterialIcons name="groups" size={24} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.infoLabel}>Workers Present</Text>
              <Text style={styles.infoValue}>{job?.workersNeeded || '10'} People</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <View style={styles.rowIcon}>
              <MaterialIcons name="access-time" size={24} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.infoLabel}>Arrival Time</Text>
              <Text style={styles.infoValue}>
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>Navigating to QR Scan in a few seconds...</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButtonWrap}
          onPress={() => navigation.navigate('QRAttendance', { job, type: 'in' })}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={colors.primaryGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.continueButton}
          >
            <Text style={styles.continueButtonText}>SHOW QR CODE</Text>
            <MaterialIcons name="qr-code- scanner" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 40,
    position: 'relative',
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
  },
  successBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#131811',
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 22,
    color: '#6f8961',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131811',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
    marginLeft: 64,
  },
  footerNote: {
    marginTop: 32,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  continueButtonWrap: {
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  continueButton: {
    flexDirection: 'row',
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

export default ArrivalAlertScreen;
