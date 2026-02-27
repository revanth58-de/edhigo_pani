// Screen 22: Worker Status
// Based on: worker-status.html
// Flow: Attendance Confirmed -> Worker Status (Working)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, shadows, borderRadius } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';

const STATUS_OPTIONS = [
  {
    key: 'available',
    title: 'Ready to Work',
    subtitle: 'Available',
    icon: 'check-circle',
    color: colors.primary,
    bgColor: 'rgba(91, 236, 19, 0.1)',
  },
  {
    key: 'working',
    title: 'In Progress',
    subtitle: 'Working',
    icon: 'engineering',
    color: '#ff4d4d',
    bgColor: 'rgba(255, 77, 77, 0.1)',
  },
  {
    key: 'break',
    title: 'Taking a Break',
    subtitle: 'Break',
    icon: 'coffee',
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.1)',
  },
];

const WorkerStatusScreen = ({ navigation }) => {
  const language = useAuthStore((state) => state.language) || 'en';
  const { t } = useTranslation();
  const [currentStatus, setCurrentStatus] = useState('working'); // Default to working after attendance

  useEffect(() => {
  }, []);

  const handleStatusChange = (statusKey) => {
    setCurrentStatus(statusKey);
    // Use optional chaining just in case
    const statusObj = STATUS_OPTIONS.find(s => s.key === statusKey);
    if (statusObj) {
      // Voice guidance removed
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.avatarContainer}>
          <MaterialIcons name="account-circle" size={32} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>My Status</Text>
        <TouchableOpacity style={styles.bellBtn}>
          <MaterialIcons name="notifications" size={24} color="#131811" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hintText}>TAP TO CHANGE</Text>

        {STATUS_OPTIONS.map((status) => {
          const isActive = currentStatus === status.key;
          return (
            <TouchableOpacity
              key={status.key}
              style={[
                styles.statusCard,
                isActive && { borderColor: status.color, borderWidth: 4 },
              ]}
              onPress={() => handleStatusChange(status.key)}
              activeOpacity={0.9}
            >
              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.cardTitle}>{status.title}</Text>
                  <Text style={[styles.cardSubtitle, { color: status.color }]}>
                    {status.subtitle}
                  </Text>
                  {isActive && (
                    <View style={styles.activeBadge}>
                      <MaterialIcons name="check-circle" size={16} color={status.color} />
                      <Text style={styles.activeText}>Active Now</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.iconBox, { backgroundColor: status.bgColor }]}>
                  <MaterialIcons name={status.icon} size={48} color={status.color} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Finish Job Button (Simulation) */}
        <TouchableOpacity
          style={styles.finishBtn}
          onPress={() => navigation.navigate('RateFarmer')}
        >
          <MaterialIcons name="check" size={24} color="#fff" />
          <Text style={styles.finishBtnText}>FINISH JOB (SIMULATE)</Text>
        </TouchableOpacity>

      </ScrollView>


      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="radio-button-checked" size={28} color={colors.primary} />
          <Text style={[styles.navText, { color: colors.primary }]}>Status</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="history" size={28} color="#9ca3af" />
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('WorkerProfile')}
        >
          <MaterialIcons name="person" size={28} color="#9ca3af" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8f6',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(91, 236, 19, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
  },
  bellBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    gap: 16,
    paddingBottom: 100,
  },
  hintText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 8,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    ...shadows.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#131811',
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtn: {
    backgroundColor: '#131811',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 8,
  },
  finishBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#9ca3af',
  },
});

export default WorkerStatusScreen;
