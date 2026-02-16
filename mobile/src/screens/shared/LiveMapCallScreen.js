// Screen 32: Live Map Call - Shared screen
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const LiveMapCallScreen = ({ navigation, route }) => {
  const { worker } = route.params || {};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.mapContainer}>
        <MaterialIcons name="map" size={100} color="rgba(91, 236, 19, 0.3)" />
        <Text style={styles.mapLabel}>Live Tracking</Text>
      </View>

      <View style={styles.callCard}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={64} color={colors.primary} />
        </View>
        <Text style={styles.name}>{worker?.name || 'Worker'}</Text>
        <Text style={styles.distance}>0.8 km away</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.callButton}>
            <MaterialIcons name="phone" size={32} color="#FFFFFF" />
            <Text style={styles.callText}>CALL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="close" size={32} color="#FFFFFF" />
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
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6f8961',
    marginTop: 16,
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
