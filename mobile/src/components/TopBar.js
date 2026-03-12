// Shared Top App Bar with Notification Bell + unread badge
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import useNotificationStore from '../store/notificationStore';

const TopBar = ({ title = 'Home', showBack = false, navigation, onBack }) => {
  const notifications = useNotificationStore((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  };

  const handleBell = () => {
    if (navigation) {
      navigation.navigate('Notifications');
    }
  };

  return (
    <View style={styles.topBar}>
      {showBack && navigation ? (
        <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#131811" />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButtonPlaceholder} />
      )}

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      {/* Notification Bell */}
      <TouchableOpacity style={styles.bellButton} onPress={handleBell}>
        <MaterialIcons name="notifications-none" size={26} color={colors.primary} />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 48,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 100,
  },
  iconButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center', alignItems: 'center',
  },
  iconButtonPlaceholder: { width: 44 },
  title: {
    fontSize: 20, fontWeight: 'bold', color: '#131811',
    flex: 1, textAlign: 'center', marginHorizontal: 8,
  },
  bellButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${colors.primary}0D`,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: `${colors.primary}33`,
  },
  badge: {
    position: 'absolute',
    top: 4, right: 4,
    minWidth: 16, height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: { fontSize: 9, fontWeight: '900', color: '#FFF' },
});

export default TopBar;
