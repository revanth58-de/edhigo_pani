/**
 * QuickActions
 * M1 SPLIT: Extracted from WorkerHomeScreen.
 *
 * The 2×2 grid of quick-action cards on the worker home screen:
 *   My Groups · Job Offers · Scan QR · Help
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const QuickActions = ({ navigation, pendingOffer, onJobOffers, onHelp }) => {
  const actions = [
    {
      id: 'groups',
      icon: 'groups',
      label: 'My Groups',
      color: colors.primary,
      bg: '#F2F4F0',
      onPress: () => navigation.navigate('Groups'),
    },
    {
      id: 'offers',
      icon: 'work',
      label: 'Job Offers',
      color: '#D97706',
      bg: '#FEF3C7',
      badge: pendingOffer ? '1' : null,
      onPress: onJobOffers,
    },
    {
      id: 'earnings',  // F1: Worker Earnings Dashboard
      icon: 'account-balance-wallet',
      label: 'My Earnings',
      color: '#10B981',
      bg: '#ECFDF5',
      onPress: () => navigation.navigate('EarningsDashboard'),
    },
    {
      id: 'qr',
      icon: 'qr-code-scanner',
      label: 'Scan QR',
      color: colors.primary,
      bg: '#F2F4F0',
      onPress: () => navigation.navigate('QRScanner', { role: 'worker' }),
    },
    {
      id: 'help',
      icon: 'support-agent',
      label: 'Help',
      color: colors.primary,
      bg: '#F2F4F0',
      onPress: onHelp,
    },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={styles.card}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: action.bg, position: 'relative' }]}>
            {action.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{action.badge}</Text>
              </View>
            )}
            <MaterialIcons name={action.icon} size={30} color={action.color} />
          </View>
          <Text style={[styles.label, { color: action.id === 'offers' ? '#D97706' : '#131811' }]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  card: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconCircle: {
    padding: 16,
    borderRadius: 9999,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
});

export default QuickActions;
