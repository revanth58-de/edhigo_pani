// Screen: Job Cancelled by Farmer - Worker notification screen
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';

const JobCancelledScreen = ({ navigation, route }) => {
  const { job } = route.params || {};
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Entrance animations
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const farmerName = job?.farmerName || job?.farmer?.name || 'Farmer';
  const workType = job?.workType
    ? job.workType.charAt(0).toUpperCase() + job.workType.slice(1)
    : 'Job';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.content}>
        {/* Cancelled Icon with Animation */}
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <MaterialIcons name="cancel" size={80} color="#EF4444" />
            </View>
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={styles.title}>
            {t('voice.jobCancelledByFarmer') || 'Job Cancelled'}
          </Text>
          <Text style={styles.subtitle}>
            {farmerName} cancelled the {workType.toLowerCase()} request
          </Text>
        </Animated.View>

        {/* Details Card */}
        <Animated.View
          style={[
            styles.detailsCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MaterialIcons name="person" size={22} color="#EF4444" />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Farmer</Text>
              <Text style={styles.detailValue}>{farmerName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MaterialIcons name="agriculture" size={22} color="#EF4444" />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Work Type</Text>
              <Text style={styles.detailValue}>{workType}</Text>
            </View>
          </View>

          {job?.payPerDay && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialIcons name="payments" size={22} color="#EF4444" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Pay</Text>
                  <Text style={styles.detailValue}>₹{job.payPerDay}/day</Text>
                </View>
              </View>
            </>
          )}
        </Animated.View>

      </View>

      {/* Go Home Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('WorkerHome')}
          activeOpacity={0.9}
        >
          <MaterialIcons name="home" size={28} color="#FFFFFF" />
          <Text style={styles.homeButtonText}>GO TO HOME</Text>
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
  iconOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#131811',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#131811',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#FECACA',
    marginVertical: 14,
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  voiceText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  homeButton: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#EF4444',
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  homeButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

export default JobCancelledScreen;
