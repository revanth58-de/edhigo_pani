/**
 * JobOfferBanner
 * M1 SPLIT: Extracted from WorkerHomeScreen.
 *
 * Shows a sticky amber banner when a new job offer arrives via socket.
 * Tapping VIEW navigates to JobOfferScreen and clears the banner.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const JobOfferBanner = ({ offer, onView, onDismiss }) => {
  if (!offer) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFFBEB', '#FEF3C7']} style={styles.gradient}>
        <View style={styles.left}>
          <MaterialIcons name="agriculture" size={22} color="#D97706" />
          <View>
            <Text style={styles.title}>🌾 Job Available!</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {offer.workType} • ₹{offer.payPerDay}/day
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.viewBtn} onPress={onView}>
            <Text style={styles.viewBtnText}>VIEW</Text>
          </TouchableOpacity>
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
              <MaterialIcons name="close" size={16} color="#B45309" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  sub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
  },
  dismissBtn: {
    padding: 6,
  },
});

export default JobOfferBanner;
