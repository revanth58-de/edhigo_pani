// Screen 32: Live Map Call - Real map with route line and working CALL button
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { calculateDistance } from '../../utils/location';
import useAuthStore from '../../store/authStore';

const LiveMapCallScreen = ({ navigation, route }) => {
  const { worker } = route.params || {};
  const user = useAuthStore((state) => state.user);

  const getDistanceDisplay = () => {
    if (user?.latitude && user?.longitude && worker?.latitude && worker?.longitude) {
      const d = calculateDistance(user.latitude, user.longitude, worker.latitude, worker.longitude);
      return d < 1 ? `${Math.round(d * 1000)}m away` : `${d.toFixed(1)} km away`;
    }
    return 'Tracking location...';
  };

  const handleCall = () => {
    const phone = worker?.phone;
    if (!phone) {
      Alert.alert('Not Available', 'Worker phone number is not available.');
      return;
    }
    // Strip any non-digits and open the dialer
    const cleaned = phone.replace(/\D/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() =>
      Alert.alert('Error', 'Could not open the phone dialer.')
    );
  };

  // Build map region centred between user and worker
  const getMapRegion = () => {
    const userLat = user?.latitude ? parseFloat(user.latitude) : null;
    const userLng = user?.longitude ? parseFloat(user.longitude) : null;
    const workerLat = worker?.latitude ? parseFloat(worker.latitude) : null;
    const workerLng = worker?.longitude ? parseFloat(worker.longitude) : null;

    if (userLat && userLng && workerLat && workerLng) {
      const midLat = (userLat + workerLat) / 2;
      const midLng = (userLng + workerLng) / 2;
      const delta = Math.max(Math.abs(userLat - workerLat), Math.abs(userLng - workerLng)) * 1.5 + 0.01;
      return { latitude: midLat, longitude: midLng, latitudeDelta: delta, longitudeDelta: delta };
    }
    if (workerLat && workerLng) {
      return { latitude: workerLat, longitude: workerLng, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    // Default to Hyderabad
    return { latitude: 17.385, longitude: 78.4867, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  };

  const routeCoords = [];
  if (user?.latitude && user?.longitude)
    routeCoords.push({ latitude: parseFloat(user.latitude), longitude: parseFloat(user.longitude) });
  if (worker?.latitude && worker?.longitude)
    routeCoords.push({ latitude: parseFloat(worker.latitude), longitude: parseFloat(worker.longitude) });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Real Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          region={getMapRegion()}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
        >
          {/* Worker marker */}
          {worker?.latitude && worker?.longitude && (
            <Marker
              coordinate={{
                latitude: parseFloat(worker.latitude),
                longitude: parseFloat(worker.longitude),
              }}
              title={worker?.name || 'Worker'}
              description={getDistanceDisplay()}
            >
              <View style={styles.workerPin}>
                <MaterialIcons name="person" size={20} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Route line between user and worker */}
          {routeCoords.length === 2 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={colors.primary}
              strokeWidth={3}
              lineDashPattern={[8, 4]}
            />
          )}
        </MapView>

        {/* Back button overlay */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color="#131811" />
        </TouchableOpacity>

        {/* Live tracking badge */}
        <View style={styles.trackingBadge}>
          <View style={styles.trackingDot} />
          <Text style={styles.trackingText}>Live Tracking</Text>
        </View>
      </View>

      {/* Bottom call card */}
      <View style={styles.callCard}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={64} color={colors.primary} />
        </View>
        <Text style={styles.name}>{worker?.name || 'Worker'}</Text>
        <Text style={styles.distance}>{getDistanceDisplay()}</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.callButton} onPress={handleCall} activeOpacity={0.85}>
            <MaterialIcons name="phone" size={28} color="#FFFFFF" />
            <Text style={styles.callText}>CALL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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
    position: 'relative',
    overflow: 'hidden',
  },
  workerPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EF4444',
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
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
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
  trackingBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  trackingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#131811',
  },
  callCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}1A`,
    borderWidth: 4,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 4,
  },
  distance: {
    fontSize: 16,
    color: '#6f8961',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#10B981',
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  callText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default LiveMapCallScreen;
