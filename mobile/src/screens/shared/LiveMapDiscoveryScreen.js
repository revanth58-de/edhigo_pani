// Screen 31: Live Map Discovery - Shared screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors } from '../../theme/colors';

const LiveMapDiscoveryScreen = ({ navigation }) => {
  const [nearbyWorkers, setNearbyWorkers] = useState([
    { id: '1', name: 'Ravi', distance: '0.5 km', status: 'available' },
    { id: '2', name: 'Kumar', distance: '1.2 km', status: 'available' },
    { id: '3', name: 'Prasad', distance: '2.1 km', status: 'available' },
  ]);

  useEffect(() => {
    Speech.speak('Live map showing nearby workers', { language: 'en' });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <MaterialIcons name="map" size={120} color="rgba(91, 236, 19, 0.3)" />
        <Text style={styles.mapText}>Live Map View</Text>
      </View>

      {/* Nearby Workers List */}
      <View style={styles.workersList}>
        <View style={styles.listHeader}>
          <MaterialIcons name="people" size={24} color={colors.primary} />
          <Text style={styles.listTitle}>Nearby Workers</Text>
        </View>

        {nearbyWorkers.map((worker) => (
          <TouchableOpacity key={worker.id} style={styles.workerCard}>
            <View style={styles.workerAvatar}>
              <MaterialIcons name="person" size={32} color={colors.primary} />
            </View>
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{worker.name}</Text>
              <Text style={styles.workerDistance}>{worker.distance} away</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Available</Text>
            </View>
          </TouchableOpacity>
        ))}
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
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6f8961',
    marginTop: 16,
  },
  workersList: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: '50%',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.backgroundLight,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#131811',
  },
  workerDistance: {
    fontSize: 14,
    color: '#6f8961',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.primary}33`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#131811',
  },
});

export default LiveMapDiscoveryScreen;
