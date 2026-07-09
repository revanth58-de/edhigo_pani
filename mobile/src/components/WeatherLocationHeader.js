import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';

const WeatherLocationHeader = () => {
  const [locationName, setLocationName] = useState('Detecting...');
  const [weather, setWeather] = useState({ temp: '--', condition: 'Clear' });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) setLocationName('Access Denied');
          return;
        }

        // Get actual location name
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        let geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        let placeName = 'Unknown Location';
        if (geo && geo.length > 0) {
          placeName = geo[0].city || geo[0].district || geo[0].subregion || geo[0].region || 'Your Location';
        }

        const getMockWeather = () => {
          const hour = new Date().getHours();
          let tempVal = 30;
          let condition = 'Sunny';
          if (hour >= 18 || hour <= 6) {
            tempVal = 24;
            condition = 'Clear';
          } else if (hour >= 12 && hour <= 15) {
            tempVal = 34;
            condition = 'Sunny';
          } else if (hour >= 16 && hour <= 17) {
            tempVal = 28;
            condition = 'Cloudy';
          }
          return { temp: tempVal + '°C', condition };
        };

        // Fetch real weather from OpenWeatherMap using API key
        try {
          const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
          if (!apiKey) {
            const mock = getMockWeather();
            if (isMounted) {
              setLocationName(placeName);
              setWeather(mock);
            }
            return;
          }
          const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`);
          const data = await response.json();

          if (data.cod !== 200) {
            throw new Error(data.message || 'Error fetching from OpenWeatherMap');
          }

          const temp = Math.round(data.main.temp) + '°C';
          const main = data.weather[0].main;
          let condition = 'Clear';
          if (main === 'Clear') condition = 'Sunny';
          else if (main === 'Clouds') condition = 'Cloudy';
          else if (main === 'Rain' || main === 'Drizzle') condition = 'Rainy';
          else if (main === 'Thunderstorm') condition = 'Storm';
          else if (main === 'Snow') condition = 'Snow';
          else if (main === 'Fog' || main === 'Mist' || main === 'Haze') condition = 'Fog';

          if (isMounted) {
            setLocationName(placeName);
            setWeather({ temp, condition });
          }
        } catch (err) {
          console.warn('Weather fetch failed, falling back to mock weather:', err.message);
          const mock = getMockWeather();
          if (isMounted) {
            setLocationName(placeName);
            setWeather(mock);
          }
        }
      } catch (e) {
        if (isMounted) setLocationName('Location Error');
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'Cloudy': return 'wb-cloudy';
      case 'Rainy': return 'umbrella';
      case 'Storm': return 'flash-on';
      case 'Snow': return 'ac-unit';
      case 'Fog': return 'cloud-queue';
      default: return 'wb-sunny';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.section}>
          <MaterialIcons name="location-on" size={24} color={colors.primary} />
          <View style={styles.textColumn}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value} numberOfLines={1}>{locationName}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <MaterialIcons name={getWeatherIcon(weather.condition)} size={24} color={colors.accent || '#F59E0B'} />
          <View style={styles.textColumn}>
            <Text style={styles.label}>Weather</Text>
            <Text style={styles.value} numberOfLines={1}>{weather.temp} • {weather.condition}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginTop: 12,
    marginBottom: 8,
    zIndex: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    }),
  },
  section: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
});

export default WeatherLocationHeader;
