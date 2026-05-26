/**
 * WorkerStats.js
 * M1 SPLIT: Extracted/Added sub-component for WorkerHomeScreen.
 *
 * Displays a premium, well-styled horizontal row of stats for the worker:
 *  - Completed Jobs count
 *  - Average Rating
 *  - Years of Experience
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const WorkerStats = ({ user, completedJobsCount }) => {
  const ratingText = user?.ratingAvg && user.ratingAvg > 0 
    ? `${user.ratingAvg.toFixed(1)} ★` 
    : 'New';

  const stats = [
    {
      id: 'jobs',
      icon: 'done-all',
      label: 'Completed',
      value: completedJobsCount ? `${completedJobsCount} Jobs` : '0 Jobs',
      color: colors.primary,
      bg: '#F0F5EC',
    },
    {
      id: 'rating',
      icon: 'star',
      label: 'Rating',
      value: ratingText,
      color: '#F59E0B',
      bg: '#FEF3C7',
    },
    {
      id: 'exp',
      icon: 'workspace-premium',
      label: 'Experience',
      value: user?.experience ? `${user.experience} Years` : '0 Years',
      color: '#8B5CF6',
      bg: '#F5F3FF',
    },
  ];

  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.id} style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: stat.bg }]}>
            <MaterialIcons name={stat.icon} size={22} color={stat.color} />
          </View>
          <Text style={styles.value}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconCircle: {
    padding: 10,
    borderRadius: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '900',
    color: '#131811',
    textAlign: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

export default WorkerStats;
