/**
 * EarningsCard.js
 * M1 SPLIT: Extracted/Added sub-component for WorkerHomeScreen.
 *
 * Displays a premium card with the worker's earnings summary:
 *   - Shows Total Earned or Month's earnings
 *   - Quick-action to open full Earnings Dashboard
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const formatINR = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const EarningsCard = ({ summary, onViewDashboard }) => {
  const totalEarned = summary?.totalEarned || 0;
  const thisMonth = summary?.thisMonth || 0;
  const pendingAmount = summary?.pendingAmount || 0;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onViewDashboard}
      style={styles.container}
    >
      <LinearGradient
        colors={[colors.primary, `${colors.primary}D5`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="account-balance-wallet" size={20} color={colors.primary} />
            </View>
            <Text style={styles.title}>YOUR EARNINGS</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.body}>
          <View style={styles.earnedCol}>
            <Text style={styles.earnedLabel}>Total Earned</Text>
            <Text style={styles.earnedVal}>{formatINR(totalEarned)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.earnedCol}>
            <Text style={styles.earnedLabel}>This Month</Text>
            <Text style={styles.earnedVal}>{formatINR(thisMonth)}</Text>
          </View>
        </View>

        {pendingAmount > 0 && (
          <View style={styles.pendingRow}>
            <MaterialIcons name="pending" size={14} color="#FEF3C7" />
            <Text style={styles.pendingText}>
              {formatINR(pendingAmount)} pending transfer
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  gradient: {
    padding: 20,
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1.5,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earnedCol: {
    flex: 1,
  },
  earnedLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  earnedVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  pendingText: {
    color: '#FEF3C7',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default EarningsCard;
