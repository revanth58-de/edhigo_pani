// Screen 31: Live Map Discovery - Real map with nearby worker markers
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import BottomNavBar from '../../components/BottomNavBar';
import { jobService } from '../../services/api/jobService';

const { width } = Dimensions.get('window');

const LiveMapDiscoveryScreen = ({ navigation, route }) => {
  const user = useAuthStore((state) => state.user);
  const language = useAuthStore((state) => state.language) || 'en';
  const { t } = useTranslation();
  const [nearbyWorkers, setNearbyWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    initLocation();
  }, []);

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(true);
        setLoading(false);
        fetchNearbyWorkers(null, null);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      fetchNearbyWorkers(latitude, longitude);
    } catch (err) {
      console.log('Location error:', err);
      setLocationError(true);
      fetchNearbyWorkers(null, null);
    }
  };

  const fetchNearbyWorkers = async (lat, lng) => {
    try {
      let url = '/jobs/nearby';
      const params = {};
      if (lat != null) params.lat = lat;
      if (lng != null) params.lng = lng;
      const response = await jobService.getNearbyWorkers(params);
      if (response.success && response.data?.data) {
        setNearbyWorkers(response.data.data);
      } else {
        setNearbyWorkers([]);
      }
    } catch (error) {
      console.log('Fetch nearby workers error:', error);
      setNearbyWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerPress = (worker) => {
    navigation.navigate('LiveMapCall', { worker });
  };

  const handleSendRequest = () => {
    const selectedWorkType = route.params?.workType || 'Labour';
    navigation.navigate('SelectWorkers', { workType: selectedWorkType });
  };

  const centerOnUser = () => {
    if (region && mapRef.current) {
      mapRef.current.animateToRegion(region, 500);
    }
  };

  const nearbyCount = nearbyWorkers.length;

  const isFarmer = user?.role === 'farmer';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />


      {/* Map Area */}
      <View style={styles.mapContainer}>
        {loading && !region ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Finding your location...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            region={region || {
              latitude: 17.385,
              longitude: 78.4867,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
          >
            {/* Nearby Worker Markers */}
            {nearbyWorkers
              .filter((w) => w.latitude && w.longitude)
              .map((worker) => (
                <Marker
                  key={worker.id}
                  coordinate={{
                    latitude: parseFloat(worker.latitude),
                    longitude: parseFloat(worker.longitude),
                  }}
                  title={worker.name || 'Worker'}
                  description={`⭐ ${worker.ratingAvg?.toFixed(1) || 'New'} • ${worker.skills || 'General'}`}
                  onCalloutPress={() => handleWorkerPress(worker)}
                  onPress={() => handleWorkerPress(worker)}
                >
                  <View style={styles.workerPin}>
                    <MaterialIcons name="person" size={18} color="#fff" />
                  </View>
                </Marker>
              ))}
          </MapView>
        )}

        {/* Re-center button */}
        <View style={styles.zoomControls}>
          <TouchableOpacity style={styles.zoomButton} onPress={centerOnUser}>
            <MaterialIcons name="my-location" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Worker count badge on map */}
        {!loading && nearbyCount > 0 && (
          <View style={styles.mapBadge}>
            <MaterialIcons name="people" size={14} color="#fff" />
            <Text style={styles.mapBadgeText}>{nearbyCount} nearby</Text>
          </View>
        )}
      </View>

      {/* Bottom card — farmer gets Send Request, workers/leaders get info */}
      <View style={styles.bottomCard}>
        <View style={styles.workerCountRow}>
          <View>
            <Text style={styles.workerCountTitle}>
              {loading ? '...' : nearbyCount} {t('discovery.workersNearby')}
            </Text>
            <View style={styles.readyRow}>
              <View style={styles.greenDot} />
              <Text style={styles.readyText}>{t('discovery.readyToStart')}</Text>
            </View>
          </View>
        </View>

        {isFarmer ? (
          <TouchableOpacity
            style={styles.sendRequestButton}
            onPress={handleSendRequest}
            activeOpacity={0.9}
          >
            <MaterialIcons name="send" size={24} color="#FFFFFF" />
            <Text style={styles.sendRequestText}>{t('discovery.sendRequest')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.infoCard}>
            <MaterialIcons name="info-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>Tap a marker to view & call a worker</Text>
          </View>
        )}
      </View>

      {/* Bottom Navigation */}
      <BottomNavBar role={user?.role || 'farmer'} activeTab="Home" />
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
    backgroundColor: '#E8EDDF',
    position: 'relative',
    overflow: 'hidden',
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  workerPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  zoomControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  mapBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  mapBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  workerCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  workerCountTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#131811',
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  readyText: {
    fontSize: 14,
    color: '#6f8961',
    fontWeight: '500',
  },
  sendRequestButton: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  sendRequestText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

export default LiveMapDiscoveryScreen;
