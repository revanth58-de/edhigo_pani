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
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import { socketService } from '../../services/socketService';
import MapDashboard from '../../components/MapDashboard';
import useAuthStore from '../../store/authStore';
import { calculateDistance, estimateETA } from '../../utils/location';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';

const NavigationScreen = ({ navigation, route }) => {
  const { job } = route.params || {};
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [distance, setDistance] = useState(t('common.calculating') || '...');
  const [eta, setETA] = useState('--');
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {

    // Connect socket
    socketService.connect();

    // Join rooms for real-time updates
    if (user?.id) {
      socketService.joinUserRoom(user.id);
    }
    if (job?.id) {
      socketService.joinJobRoom(job.id);
    }

    // Listen for job cancellation by farmer
    socketService.onJobCancelled((data) => {
      if (data.jobId === job?.id) {
        console.log('❌ Job cancelled by farmer:', data);
        navigation.replace('JobCancelled', {
          job: {
            ...job,
            farmerName: data.farmerName,
            workType: data.workType,
          },
        });
      }
    });

    // Start location tracking
    let locationSubscription;
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 1 },
        (location) => {
          const { latitude, longitude } = location.coords;
          setCurrentLocation([longitude, latitude]);

          // Dynamic calculation
          if (job?.farmLatitude && job?.farmLongitude) {
            const d = calculateDistance(latitude, longitude, job.farmLatitude, job.farmLongitude);
            if (d !== null) {
              setDistance(d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)} km`);
              const e = estimateETA(d);
              setETA(e < 1 ? '< 1 min' : `${e} min`);

              // Emit update with calculated fields
              socketService.emitLocation({
                userId: user?.id,
                jobId: job?.id,
                latitude,
                longitude,
                distance: d,
                eta: `${e} min`,
              });
            }
          }
        }
      );
    };

    startTracking();

    return () => {
      socketService.offJobCancelled();
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
        <View style={styles.infoCardContent}>
          <View style={styles.topRow}>
            <View style={styles.mainInfo}>
              <Text style={styles.etaValue}>{eta}</Text>
              <Text style={styles.distanceValue}>{distance}</Text>
            </View>
            <TouchableOpacity style={styles.callButtonWrap} onPress={handleCall} activeOpacity={0.8}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.callButton}
              >
                <MaterialIcons name="call" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.destinationRow}>
            <View style={styles.locIconWrap}>
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
            </View>
            <View style={styles.locTextWrap}>
              <Text style={styles.locLabel}>DESTINATION</Text>
              <Text style={styles.locValue} numberOfLines={1}>
                {job?.farmAddress || 'Malkapur Farm, Hyderabad'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.mapsButton} onPress={handleOpenMaps} activeOpacity={0.8}>
            <MaterialIcons name="directions" size={20} color={colors.primary} />
            <Text style={styles.mapsButtonText}>OPEN IN GOOGLE MAPS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Arrival Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.arrivedButtonWrap}
          onPress={() => {
            socketService.socket?.emit('job:arrival', { jobId: job?.id, workerId: user?.id });
            navigation.navigate('QRScanner', { job });
          }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={colors.primaryGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.arrivedButton}
          >
            <Text style={styles.arrivedButtonText}>I HAVE ARRIVED</Text>
            <MaterialIcons name="check-circle" size={24} color="#FFFFFF" />
          </LinearGradient>
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
    backgroundColor: '#F3F4F6',
  },
  infoCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
  },
  infoCardContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mainInfo: {
    flexDirection: 'column',
  },
  etaValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
  },
  distanceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9CA3AF',
    marginTop: -2,
    textTransform: 'uppercase',
  },
  callButtonWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  callButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  locIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locTextWrap: {
    flex: 1,
  },
  locLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  locValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#131811',
    marginTop: 2,
  },
  mapsButton: {
    flexDirection: 'row',
    height: 54,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  mapsButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#131811',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  arrivedButtonWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  arrivedButton: {
    flexDirection: 'row',
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  arrivedButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

export default NavigationScreen;
