// Screen 19: Navigation - Real-time In-App Navigation with Route Overlay and native expo-linking deep links
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Platform,
  Animated,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import { socketService } from '../../services/socketService';
import useAuthStore from '../../store/authStore';
import { calculateDistance, estimateETA } from '../../utils/location';
import { LinearGradient } from 'expo-linear-gradient';

// Dynamically import MapView only on native platforms
const isWeb = Platform.OS === 'web';
let MapView, Marker, Polyline;

if (!isWeb) {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

// ─── Web Simulated MapView Stub Component ───
const WebMapStub = ({ userLocation, farmCoords, job }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 1000, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.webStubContainer}>
      <LinearGradient
        colors={['#1F2937', '#111827']}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Simulated Map Grid */}
      <View style={styles.webGridOverlay} />

      {/* SVG Path Route overlay simulator */}
      <View style={styles.webSvgWrapper}>
        <Text style={styles.webRouteHint}>In-App Navigation Active</Text>
      </View>

      {/* Simulated Route Banner */}
      <View style={styles.webRouteCard}>
        <MaterialIcons name="navigation" size={24} color={colors.primary} style={styles.webNavIcon} />
        <View style={styles.webNavTextWrap}>
          <Text style={styles.webNavTitle}>Head North on Malkapur Road</Text>
          <Text style={styles.webNavSub}>Walk straight towards {job?.farmAddress || 'Farm'}</Text>
        </View>
      </View>

      {/* Destination Farm Marker */}
      <View style={[styles.webMarker, styles.webFarmMarker]}>
        <View style={styles.webMarkerPulse}>
          <MaterialIcons name="agriculture" size={22} color="#FFFFFF" />
        </View>
        <Text style={styles.webMarkerLabel}>{job?.farmAddress || 'Farm Location'}</Text>
      </View>

      {/* Worker Marker */}
      <View style={[styles.webMarker, styles.webWorkerMarker]}>
        <Animated.View style={[styles.webWorkerPulse, { transform: [{ scale: pulse }] }]}>
          <View style={styles.webWorkerDot} />
        </Animated.View>
        <Text style={styles.webMarkerLabel}>Your Location</Text>
      </View>
    </View>
  );
};

// ─── Main Screen Component ───
const NavigationScreen = ({ navigation, route }) => {
  const { job } = route.params || {};
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [distance, setDistance] = useState(t('common.calculating') || '...');
  const [eta, setETA] = useState('--');
  const [userLocation, setUserLocation] = useState(null);
  const lastDispatchedCoordsRef = useRef(null);

  const farmCoords = {
    latitude: job?.farmLatitude || 17.385044,
    longitude: job?.farmLongitude || 78.486671,
  };

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
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permissions are required to show route overlays.');
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        (location) => {
          const { latitude, longitude, speed } = location.coords;
          setUserLocation({ latitude, longitude });

          // Dynamic Haversine calculation
          const d = calculateDistance(latitude, longitude, farmCoords.latitude, farmCoords.longitude);
          if (d !== null) {
            setDistance(d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);
            const e = estimateETA(d);
            setETA(e < 1 ? '< 1 min' : `${e} min`);

            // F6: Motion-aware filtering and stationary suspension checks
            const isStationary = speed === 0 || (speed !== null && speed < 0.1);
            let shouldDispatch = false;

            if (!lastDispatchedCoordsRef.current) {
              shouldDispatch = true;
            } else {
              const movedDistance = calculateDistance(
                latitude,
                longitude,
                lastDispatchedCoordsRef.current.latitude,
                lastDispatchedCoordsRef.current.longitude
              );
              if (movedDistance !== null && movedDistance >= 0.02 && !isStationary) {
                shouldDispatch = true;
              }
            }

            if (shouldDispatch) {
              lastDispatchedCoordsRef.current = { latitude, longitude };
              // Emit live location updates to the socket server
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
        locationSubscription.remove();
      }
    };
  }, []);

  // Open native navigation application using deep linking without losing user session
  const handleOpenMaps = async () => {
    const lat = farmCoords.latitude;
    const lng = farmCoords.longitude;
    const label = encodeURIComponent(job?.farmAddress || 'Farm Location');

    const scheme = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });

    try {
      const supported = await Linking.canOpenURL(scheme);
      if (supported) {
        await Linking.openURL(scheme);
      } else {
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Error opening map deep link:', error);
      Alert.alert('Error', 'Unable to launch map deep link.');
    }
  };

  const handleCall = () => {
    const phoneNumber = `tel:${job?.farmer?.phone || job?.farmerPhone || 'unknown'}`;
    Linking.openURL(phoneNumber);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* live in-app Map View */}
      <View style={styles.mapContainer}>
        {isWeb ? (
          <WebMapStub userLocation={userLocation} farmCoords={farmCoords} job={job} />
        ) : (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{
              ...farmCoords,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {/* Route Overlay between User location and Farm coords */}
            {userLocation && (
              <Polyline
                coordinates={[userLocation, farmCoords]}
                strokeColor={colors.primary}
                strokeWidth={5}
                lineDashPattern={[5, 5]}
              />
            )}

            {/* Farm Marker */}
            <Marker coordinate={farmCoords} title="Farm Location">
              <View style={styles.markerBorder}>
                <View style={styles.markerInner}>
                  <MaterialIcons name="agriculture" size={18} color="#FFFFFF" />
                </View>
              </View>
            </Marker>
          </MapView>
        )}
      </View>

      {/* Floating Action Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={24} color="#131811" />
      </TouchableOpacity>

      {/* Navigation Info Card Overlay */}
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
                {job?.farmAddress || 'Farm Location'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.mapsButton} onPress={handleOpenMaps} activeOpacity={0.8}>
            <MaterialIcons name="directions" size={20} color={colors.primary} />
            <Text style={styles.mapsButtonText}>DEEP LINK TO MAP APP</Text>
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
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 44,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 999,
  },
  infoCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 124 : 108,
    left: 20,
    right: 20,
    zIndex: 100,
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
    zIndex: 100,
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

  // Premium Native Marker Styling
  markerBorder: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerInner: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // Premium Web Simulated Map Stub Styling
  webStubContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  webGridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  webRouteHint: {
    fontSize: 16,
    color: '#34D399',
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  webRouteCard: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  webNavIcon: {
    marginRight: 12,
    transform: [{ rotate: '45deg' }],
  },
  webNavTextWrap: {
    flex: 1,
  },
  webNavTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  webNavSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  webMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  webFarmMarker: {
    top: '25%',
    right: '25%',
  },
  webWorkerMarker: {
    bottom: '40%',
    left: '25%',
  },
  webMarkerPulse: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  webWorkerPulse: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webWorkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  webMarkerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
});

export default NavigationScreen;
