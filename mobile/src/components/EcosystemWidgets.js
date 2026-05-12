import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import GlassCard from './GlassCard';

/**
 * MandiPricesWidget - Shows real-time crop prices
 */
export const MandiPricesWidget = ({ prices, navigation }) => {
  return (
    <View style={styles.mandiContainer}>
      <View style={styles.widgetHeader}>
        <View style={styles.titleRow}>
          <MaterialIcons name="trending-up" size={20} color={colors.primary} />
          <Text style={styles.widgetTitle}>Live Mandi Prices</Text>
        </View>
        <TouchableOpacity onPress={() => navigation?.navigate('WorkCategories')}>
          <Text style={styles.viewMore}>View All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mandiScroll}>
        {prices.map((item, index) => (
          <GlassCard key={index} intensity={20} style={styles.priceCard}>
            <Text style={styles.cropName}>{item.crop}</Text>
            <Text style={styles.priceValue}>₹{item.price}</Text>
            <View style={styles.changeRow}>
              <MaterialIcons 
                name={item.trend === 'up' ? 'arrow-upward' : 'arrow-downward'} 
                size={14} 
                color={item.trend === 'up' ? '#22C55E' : '#EF4444'} 
              />
              <Text style={[styles.trendText, { color: item.trend === 'up' ? '#22C55E' : '#EF4444' }]}>
                {item.change}%
              </Text>
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </View>
  );
};

/**
 * AIAdvisoryBanner - Smart seasonal recommendations
 */
export const AIAdvisoryBanner = ({ advice, navigation }) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      style={styles.advisoryWrapper}
      onPress={() => navigation?.navigate('AIChatbot')}
    >
      <LinearGradient
        colors={['#EAB308', '#D97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.advisoryGradient}
      >
        <View style={styles.advisoryIcon}>
          <MaterialIcons name="psychology" size={32} color="#FFF" />
        </View>
        <View style={styles.advisoryContent}>
          <Text style={styles.advisoryTitle}>AI Farmer Insights</Text>
          <Text style={styles.advisoryText}>{advice}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#FFF" />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Mandi Styles
  mandiContainer: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  viewMore: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  mandiScroll: {
    paddingRight: 24,
    gap: 12,
  },
  priceCard: {
    width: 120,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cropName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginVertical: 4,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Advisory Styles
  advisoryWrapper: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  advisoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  advisoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  advisoryContent: {
    flex: 1,
  },
  advisoryTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.9,
  },
  advisoryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 2,
  },
});
