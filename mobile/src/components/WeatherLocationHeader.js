import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import GlassCard from './GlassCard';

const WeatherLocationHeader = () => {
  const [locationName, setLocationName] = useState('Detecting...');
  const [weather, setWeather] = useState({ temp: '--', condition: 'Clear' });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName('Location Access Denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      // Mocking geocoding for now, in production use Google Geocoding API
      setLocationName('Guntur, AP'); 
      setWeather({ temp: '32°C', condition: 'Sunny' }); // Mocked weather
    })();
  }, []);

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'Cloudy': return 'wb-cloudy';
      case 'Rainy': return 'umbrella';
      default: return 'wb-sunny';
    }
  };

  return (
    <View style={styles.container}>
      <GlassCard intensity={20} tint="light" style={styles.glassCard}>
        <View style={styles.row}>
          <View style={styles.item}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="location-on" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.label}>Your Village</Text>
              <Text style={styles.value}>{locationName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.item}>
            <View style={styles.iconCircle}>
              <MaterialIcons name={getWeatherIcon(weather.condition)} size={18} color={colors.accent} />
            </View>
            <View>
              <Text style={styles.label}>Weather</Text>
              <Text style={styles.value}>{weather.temp} • {weather.condition}</Text>
            </View>
          </View>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginTop: 10, // Changed from negative to positive for better visibility
    zIndex: 10,
  },
  glassCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FFFFFF', // Solid white for better visibility
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9', // Light gray background for icons
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B', // Muted dark gray
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B', // Deep navy/black
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
});

export default WeatherLocationHeader;
