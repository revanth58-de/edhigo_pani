// Shared Bottom Navigation Bar - Home, History, Show QR, Profile
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';

const FARMER_TABS = [
  { key: 'Home', icon: 'home', label: 'Home', screen: 'FarmerHome' },
  { key: 'History', icon: 'history', label: 'History', screen: 'FarmerHome', params: { tab: 'history' } },
  { key: 'ShowQR', icon: 'qr-code', label: 'Show QR', screen: 'QRAttendance', params: { type: 'in' } },
  { key: 'Profile', icon: 'person', label: 'Profile', screen: 'FarmerProfile' },
];

const WORKER_TABS = [
  { key: 'Home', icon: 'home', label: 'Home', screen: 'WorkerHome' },
  { key: 'History', icon: 'history', label: 'History', screen: 'WorkerHome', params: { tab: 'history' } },
  { key: 'ShowQR', icon: 'qr-code', label: 'Show QR', screen: 'QRScanner' },
  { key: 'Profile', icon: 'person', label: 'Profile', screen: 'WorkerProfile' },
];

const LEADER_TABS = [
  { key: 'Home', icon: 'home', label: 'Home', screen: 'LeaderHome' },
  { key: 'History', icon: 'history', label: 'History', screen: 'LeaderHome', params: { tab: 'history' } },
  { key: 'ShowQR', icon: 'qr-code', label: 'Show QR', screen: 'GroupQRAttendance' },
  { key: 'Profile', icon: 'person', label: 'Profile', screen: 'LeaderHome', params: { tab: 'profile' } },
];

const ROLE_TABS = {
  farmer: FARMER_TABS,
  worker: WORKER_TABS,
  leader: LEADER_TABS,
};

const BottomNavBar = ({ role = 'farmer', activeTab = 'Home' }) => {
  const navigation = useNavigation();
  const tabs = ROLE_TABS[role] || FARMER_TABS;

  const handlePress = (tab) => {
    try {
      if (tab.params) {
        navigation.navigate(tab.screen, tab.params);
      } else {
        navigation.navigate(tab.screen);
      }
    } catch (e) {
      console.warn('Navigation error:', e.message);
    }
  };

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => handlePress(tab)}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <MaterialIcons
                name={tab.icon}
                size={26}
                color={isActive ? colors.primary : '#9CA3AF'}
              />
            </View>
            <Text style={[styles.navText, isActive && styles.navTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    gap: 2,
    minWidth: 64,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: `${colors.primary}1A`,
  },
  navText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  navTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
});

export default BottomNavBar;
