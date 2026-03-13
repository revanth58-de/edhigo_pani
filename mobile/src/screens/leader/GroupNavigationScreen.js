import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { calculateDistance, estimateETA } from '../../utils/location';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline } from 'react-native-maps';

const GroupNavigationScreen = ({ navigation, route }) => {
    const { job, groupId } = route.params;
    const [userLocation, setUserLocation] = useState(null);
    const [distanceRemaining, setDistanceRemaining] = useState(0);
    const [eta, setEta] = useState(0);

    const farmCoords = {
        latitude: job.farmLatitude || 17.3850,
        longitude: job.farmLongitude || 78.4867,
    };

    useEffect(() => {
        let subscription;
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            subscription = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 10 },
                (loc) => {
                    const current = loc.coords;
                    setUserLocation(current);

                    const dist = calculateDistance(
                        current.latitude, current.longitude,
                        farmCoords.latitude, farmCoords.longitude
                    );
                    setDistanceRemaining(dist);
                    setEta(estimateETA(dist));

                    if (dist <= 0.1) { // 100m
                        handleArrival();
                    }
                }
            );
        })();

        return () => subscription?.remove();
    }, []);

    const handleArrival = () => {
        Speech.speak("Meeru thotaku cheraru", { language: 'te' }); // "You have arrived at the farm"
        navigation.navigate('GroupCall', { job, groupId });
    };

    return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.mapContainer}>
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
          {userLocation && (
            <Polyline
              coordinates={[userLocation, farmCoords]}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[5, 5]}
            />
          )}
          <Marker coordinate={farmCoords} title="Farm Location">
            <View style={styles.markerBorder}>
              <View style={styles.markerInner}>
                <MaterialIcons name="agriculture" size={18} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        </MapView>

        <View style={styles.topCards}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#131811" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.pullBar} />
        
        <View style={styles.navHeader}>
          <View style={styles.navHeaderLeft}>
            <Text style={styles.arrivalTime}>{Math.ceil(eta)} MINS</Text>
            <Text style={styles.arrivalLabel}>estimated arrival</Text>
          </View>
          <View style={styles.distBadge}>
            <Text style={styles.distText}>{distanceRemaining.toFixed(1)} KM</Text>
          </View>
        </View>

        <View style={styles.addressCard}>
          <MaterialIcons name="location-on" size={24} color={colors.primary} />
          <Text style={styles.addressText} numberOfLines={2}>{job.farmAddress}</Text>
        </View>

        <TouchableOpacity 
          style={styles.arriveBtnTouchable} 
          onPress={handleArrival}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={colors.primaryGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.arriveBtn}
          >
            <Text style={styles.arriveBtnText}>ARRIVED AT FARM</Text>
            <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  mapContainer: {
    flex: 1,
  },
  topCards: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
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
  footer: {
    padding: 24,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  pullBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  navHeaderLeft: {
    flex: 1,
  },
  arrivalTime: {
    fontSize: 28,
    fontWeight: '900',
    color: '#131811',
    letterSpacing: -0.5,
  },
  arrivalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  distBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  distText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#166534',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  addressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    flex: 1,
    lineHeight: 20,
  },
  arriveBtnTouchable: {
    width: '100%',
  },
  arriveBtn: {
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  arriveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default GroupNavigationScreen;
