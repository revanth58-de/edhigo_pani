// Screen 19: Navigation - Exact match to navigation-worker.html
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import { getSpeechLang, safeSpeech } from '../../utils/voiceGuidance';
import { socketService } from '../../services/socketService';
import MapDashboard from '../../components/MapDashboard';
import useAuthStore from '../../store/authStore';

const NavigationScreen = ({ navigation, route }) => {
  const { job } = route.params || {};
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const language = useAuthStore((state) => state.language) || 'en';
  const [distance, setDistance] = useState('2.5 km');
  const [eta, setETA] = useState('15 min');
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    safeSpeech(t('voice.navigateToFarm'), { language: getSpeechLang(language) });

    // Connect socket
    socketService.connect();

    // Start location tracking
    let locationSubscription;
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (location) => {
          const { latitude, longitude } = location.coords;
          setCurrentLocation([longitude, latitude]);
          socketService.emitLocation({
            userId: user?.id,
            jobId: job?.id,
            latitude,
            longitude,
          });
        }
      );
    };

    startTracking();

    return () => {
      if (locationSubscription) {
        if (typeof locationSubscription.remove === 'function') {
          locationSubscription.remove();
        } else if (typeof locationSubscription.stop === 'function') {
          locationSubscription.stop();
        }
      }
    };
  }, []);

  const handleOpenMaps = async () => {
    const destination = `${job?.farmLatitude || 17.385044},${job?.farmLongitude || 78.486671}`;
    const label = job?.farmAddress || 'Farm Location';

    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${label}`;

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open maps');
    }
  };

  const handleCall = () => {
    safeSpeech(t('voice.callingFarmer'), { language: getSpeechLang(language) });
    const phoneNumber = `tel:${job?.farmer?.phone || job?.farmerPhone || 'unknown'}`;
    Linking.openURL(phoneNumber);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* live MapDashboard */}
      <View style={styles.mapContainer}>
        <MapDashboard
          height="100%"
          userLocation={currentLocation}
          markers={[{
            id: job.id,
            latitude: job.farmLatitude || 17.385044,
            longitude: job.farmLongitude || 78.486671,
            type: 'job',
            active: true
          }]}
        />
      </View>

      {/* Navigation Info Card */}
      <View style={styles.infoCard}>
        {/* Distance & ETA */}
        <View style={styles.distanceContainer}>
          <View style={styles.distanceBadge}>
            <MaterialIcons name="navigation" size={32} color={colors.primary} />
            <Text style={styles.distanceText}>{distance}</Text>
          </View>
          <View style={styles.etaBadge}>
            <MaterialIcons name="schedule" size={24} color="#FFFFFF" />
            <Text style={styles.etaText}>{eta}</Text>
          </View>
        </View>

        {/* Destination Info */}
        <View style={styles.destinationInfo}>
          <MaterialIcons name="location-on" size={24} color={colors.primary} />
          <View style={styles.destinationText}>
            <Text style={styles.destinationLabel}>Going to</Text>
            <Text style={styles.destinationAddress}>{job?.farmAddress || 'Farm Location'}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.mapsButton}
            onPress={handleOpenMaps}
            activeOpacity={0.9}
          >
            <MaterialIcons name="directions" size={32} color={colors.backgroundDark} />
            <Text style={styles.mapsButtonText}>OPEN MAPS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCall}
            activeOpacity={0.9}
          >
            <MaterialIcons name="phone" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Voice Guidance */}
        <View style={styles.voiceGuidance}>
          <MaterialIcons name="volume-up" size={20} color={colors.primary} />
          <Text style={styles.voiceText}>Follow the directions</Text>
        </View>
      </View>

      {/* Arrival Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.arrivedButton}
          onPress={() => {
            // In a real flow, we notify the server/farmer of arrival
            socketService.socket?.emit('job:arrival', { jobId: job?.id, workerId: user?.id });
            navigation.navigate('QRScanner', { job });
          }}
          activeOpacity={0.9}
        >
          <MaterialIcons name="check-circle" size={32} color={colors.backgroundDark} />
          <Text style={styles.arrivedButtonText}>I'VE ARRIVED</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#4A5568',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  infoCard: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  distanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: `${colors.primary}1A`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  distanceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131811',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  etaText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.backgroundDark,
  },
  destinationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  destinationText: {
    flex: 1,
  },
  destinationLabel: {
    fontSize: 14,
    color: '#6f8961',
    marginBottom: 4,
  },
  destinationAddress: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  mapsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 9999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mapsButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.backgroundDark,
  },
  callButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  voiceGuidance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  voiceText: {
    fontSize: 14,
    color: '#6f8961',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
  },
  arrivedButton: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  arrivedButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.backgroundDark,
  },
});

export default NavigationScreen;
