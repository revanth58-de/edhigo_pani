// Screen 31: Live Map Discovery - Map with SEND REQUEST button
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { getSpeechLang, safeSpeech } from '../../utils/voiceGuidance';
import BottomNavBar from '../../components/BottomNavBar';
import { jobService } from '../../services/api/jobService';

const { width } = Dimensions.get('window');

const LiveMapDiscoveryScreen = ({ navigation, route }) => {
  const user = useAuthStore((state) => state.user);
  const { isVoiceEnabled } = useAuthStore();
  const language = useAuthStore((state) => state.language) || 'en';
  const { t } = useTranslation();
  const [nearbyCount, setNearbyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isVoiceEnabled) {
      safeSpeech(t('discovery.tapGreenButton'), { language: getSpeechLang(language) });
    }
    fetchNearbyWorkers();
  }, []);

  const fetchNearbyWorkers = async () => {
    try {
      // Fetch available workers from jobs endpoint
      const response = await jobService.getJobs({ status: 'pending' });
      if (response.success && response.data?.data) {
        setNearbyCount(response.data.data.length || 0);
      } else {
        // Fallback: show count based on available data
        setNearbyCount(0);
      }
    } catch (error) {
      console.log('Fetch nearby workers error:', error);
      setNearbyCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = () => {
    navigation.navigate('SelectWorkers', { workType: 'Labour' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={24} color="#9CA3AF" />
        <Text style={styles.searchPlaceholder}>{t('discovery.searchNearby')}</Text>
      </View>

      {/* Map Area */}
      <View style={styles.mapContainer}>
        {/* Map Placeholder */}
        <View style={styles.mapPlaceholder}>
          <MaterialIcons name="map" size={80} color="rgba(91, 236, 19, 0.2)" />
          <Text style={styles.mapText}>{t('discovery.liveMapView')}</Text>

          {/* User Location Pin */}
          <View style={styles.youPin}>
            <MaterialIcons name="location-on" size={32} color={colors.primary} />
            <Text style={styles.youPinText}>{t('discovery.you')}</Text>
          </View>
        </View>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity style={styles.zoomButton}>
            <MaterialIcons name="remove" size={24} color="#131811" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomButton}>
            <MaterialIcons name="my-location" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Floating Action Buttons */}
        <View style={styles.floatingButtons}>
          <TouchableOpacity style={styles.micButton}>
            <MaterialIcons name="mic" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.phoneButton}>
            <MaterialIcons name="phone" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Worker Card */}
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

        <TouchableOpacity
          style={styles.sendRequestButton}
          onPress={handleSendRequest}
          activeOpacity={0.9}
        >
          <MaterialIcons name="send" size={24} color="#FFFFFF" />
          <Text style={styles.sendRequestText}>{t('discovery.sendRequest')}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <BottomNavBar role={user?.role || 'farmer'} activeTab="Discovery" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#E8EDDF',
    margin: 0,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 8,
  },
  youPin: {
    position: 'absolute',
    alignItems: 'center',
  },
  youPinText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: -4,
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 12,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  phoneButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
