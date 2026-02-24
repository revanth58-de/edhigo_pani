// Screen 10: Request Accepted - Worker details with map and CALL WORKER
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { getSpeechLang, safeSpeech } from '../../utils/voiceGuidance';
import { socketService } from '../../services/socketService';
import { jobService } from '../../services/api/jobService';
import BottomNavBar from '../../components/BottomNavBar';

const RequestAcceptedScreen = ({ navigation, route }) => {
  const { job } = route.params;
  const { isVoiceEnabled } = useAuthStore();
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';

  // Worker data from the job acceptance or fetched data
  const [worker, setWorker] = useState(null);
  const [eta, setEta] = useState('10m');

  useEffect(() => {
    if (isVoiceEnabled) {
      safeSpeech(t('requestAccepted.requestAcceptedMsg'), { language: getSpeechLang(language) });
    }

    // Try to get worker details from job acceptance data
    if (job?.workerId) {
      // Worker data might come from the socket event
      setWorker({
        id: job.workerId,
        name: job.workerName || 'Worker',
        rating: job.workerRating || 0,
        phone: job.workerPhone || null,
        photoUrl: job.workerPhotoUrl || null,
        skills: job.workerSkills || null,
        distance: job.distance || null,
      });
    }

    // Fetch full job details with worker info from backend
    fetchJobDetails();

    // Socket: listen for arrival
    socketService.connect();
    if (job?.id) {
      socketService.joinJobRoom(job.id);
    }

    socketService.socket?.on('job:arrival', (data) => {
      if (data.jobId === job?.id) {
        console.log('🏁 Workers have arrived at farm!');
        navigation.navigate('ArrivalAlert', { job });
      }
    });

    // Listen for worker location updates
    socketService.onLocationUpdate((data) => {
      if (data.workerId === job?.workerId || data.jobId === job?.id) {
        // Update ETA if provided
        if (data.eta) setEta(data.eta);
      }
    });

    return () => {
      socketService.socket?.off('job:arrival');
    };
  }, [job?.id]);

  const fetchJobDetails = async () => {
    if (!job?.id) return;
    try {
      const response = await jobService.getJob(job.id);
      if (response.success && response.data?.data) {
        const jobData = response.data.data;
        // If we have application data with worker details
        if (jobData.applications?.length > 0) {
          const accepted = jobData.applications.find(a => a.status === 'accepted');
          if (accepted?.worker) {
            setWorker({
              id: accepted.worker.id || accepted.workerId,
              name: accepted.worker.name || 'Worker',
              rating: accepted.worker.ratingAvg || 0,
              phone: accepted.worker.phone || null,
              photoUrl: accepted.worker.photoUrl || null,
              skills: accepted.worker.skills || null,
              distance: accepted.distance || null,
            });
          }
        }
      }
    } catch (error) {
      console.log('Fetch Job Details Error:', error);
    }
  };

  const handleCallWorker = () => {
    const phone = worker?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Info', t('requestAccepted.phoneNotAvailable'));
    }
  };

  const handleCancelRequest = () => {
    Alert.alert(
      t('requestAccepted.cancelRequest'),
      t('requestAccepted.cancelConfirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('requestAccepted.yesCancelIt'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (job?.id) {
                await jobService.cancelJob(job.id);
              }
              if (isVoiceEnabled) {
                safeSpeech(t('requestAccepted.requestCancelled'), { language: getSpeechLang(language) });
              }
              navigation.navigate('FarmerHome');
            } catch (error) {
              console.error('Cancel error:', error);
              navigation.navigate('FarmerHome');
            }
          },
        },
      ]
    );
  };

  // Display values from real data
  const workerName = worker?.name || 'Worker';
  const workerRating = worker?.rating ? worker.rating.toFixed(1) : '0.0';
  const workerDistance = worker?.distance ? `${worker.distance.toFixed(1)} ${t('requestAccepted.kmAway')}` : t('requestAccepted.nearby');
  const workersCount = job?.workersNeeded || 1;
  const payPerDay = job?.payPerDay || 500;
  const workTypeDisplay = job?.workType
    ? job.workType.charAt(0).toUpperCase() + job.workType.slice(1)
    : 'Labour';

  // Parse skills for display
  let skillText = `${workTypeDisplay} ${t('requestAccepted.expert')}`;
  if (worker?.skills) {
    try {
      const skillsArr = typeof worker.skills === 'string' ? JSON.parse(worker.skills) : worker.skills;
      if (Array.isArray(skillsArr) && skillsArr.length > 0) {
        skillText = skillsArr[0].charAt(0).toUpperCase() + skillsArr[0].slice(1) + ` ${t('requestAccepted.expert')}`;
      }
    } catch (e) { }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#131811" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('requestAccepted.title')}</Text>
        <TouchableOpacity>
          <MaterialIcons name="volume-up" size={24} color="#131811" />
        </TouchableOpacity>
      </View>

      {/* Map Area with Status Overlay */}
      <View style={styles.mapArea}>
        {/* Map placeholder */}
        <View style={styles.mapPlaceholder}>
          <MaterialIcons name="map" size={60} color="rgba(0,0,0,0.1)" />
        </View>

        {/* Status Card Overlay */}
        <View style={styles.statusOverlay}>
          <View style={styles.statusCard}>
            <View style={styles.statusIconWrap}>
              <MaterialIcons name="directions-walk" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.statusLabel}>STATUS</Text>
              <Text style={styles.statusText}>Worker is on the way</Text>
            </View>
          </View>
          {/* Zoom controls */}
          <View style={styles.mapZoomControls}>
            <TouchableOpacity style={styles.mapZoomBtn}>
              <MaterialIcons name="add" size={20} color="#131811" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapZoomBtn}>
              <MaterialIcons name="remove" size={20} color="#131811" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Worker Pin */}
        <View style={styles.workerPin}>
          <View style={styles.workerPinIcon}>
            <MaterialIcons name="person" size={24} color={colors.primary} />
          </View>
          <View style={styles.workerPinLabel}>
            <Text style={styles.workerPinText}>{workerName.split(' ')[0].toUpperCase()}</Text>
          </View>
        </View>

        {/* Farm Pin */}
        <View style={styles.farmPin}>
          <View style={styles.farmPinIcon}>
            <MaterialIcons name="home" size={20} color="#EF4444" />
          </View>
        </View>

        {/* Location button */}
        <TouchableOpacity style={styles.locationBtn}>
          <MaterialIcons name="my-location" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Worker Details Card */}
      <View style={styles.workerCard}>
        {/* Worker Profile Row */}
        <View style={styles.workerProfileRow}>
          <View style={styles.workerAvatarWrap}>
            {worker?.photoUrl ? (
              <Image source={{ uri: worker.photoUrl }} style={styles.workerAvatar} />
            ) : (
              <View style={[styles.workerAvatar, styles.workerAvatarPlaceholder]}>
                <MaterialIcons name="person" size={32} color="#9CA3AF" />
              </View>
            )}
          </View>
          <View style={styles.workerNameWrap}>
            <View style={styles.nameRow}>
              <Text style={styles.workerName}>{workerName}</Text>
            </View>
            <View style={styles.ratingRow}>
              <MaterialIcons name="star" size={16} color="#F59E0B" />
              <Text style={styles.ratingText}>{workerRating}</Text>
              <Text style={styles.skillText}>{skillText}</Text>
            </View>
          </View>
          <View style={styles.etaBadge}>
            <MaterialIcons name="verified" size={18} color={colors.primary} />
            <MaterialIcons name="schedule" size={18} color="#F59E0B" style={{ marginLeft: 4 }} />
            <Text style={styles.etaText}>{eta}</Text>
            <Text style={styles.etaLabel}>{t('requestAccepted.eta')}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="straighten" size={24} color="#6B7280" />
            <Text style={styles.statValue}>{workerDistance}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="people" size={24} color="#6B7280" />
            <Text style={styles.statValue}>{workersCount} Workers</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="credit-card" size={24} color="#6B7280" />
            <Text style={styles.statValue}>₹{payPerDay}{t('requestAccepted.perDay')}</Text>
          </View>
        </View>

        {/* Call Worker Button */}
        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCallWorker}
          activeOpacity={0.9}
        >
          <MaterialIcons name="phone" size={24} color="#FFFFFF" />
          <Text style={styles.callButtonText}>{t('requestAccepted.callWorker')}</Text>
        </TouchableOpacity>

        {/* Cancel Request */}
        <TouchableOpacity style={styles.cancelRequestBtn} onPress={handleCancelRequest}>
          <Text style={styles.cancelRequestText}>{t('requestAccepted.cancelRequest')}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <BottomNavBar role="farmer" activeTab="Discovery" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#131811',
  },
  mapArea: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#131811',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}33`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 1,
  },
  mapZoomControls: {
    gap: 4,
  },
  mapZoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  workerPin: {
    position: 'absolute',
    top: '35%',
    left: '30%',
    alignItems: 'center',
  },
  workerPinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  workerPinLabel: {
    backgroundColor: '#131811',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  workerPinText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  farmPin: {
    position: 'absolute',
    top: '50%',
    right: '30%',
  },
  farmPinIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  locationBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  workerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    marginTop: -16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  workerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  workerAvatarWrap: {
    marginRight: 12,
  },
  workerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  workerAvatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerNameWrap: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#131811',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#131811',
  },
  skillText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  etaBadge: {
    alignItems: 'center',
  },
  etaText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  etaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#131811',
  },
  callButton: {
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
    marginBottom: 12,
  },
  callButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cancelRequestBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  cancelRequestText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});

export default RequestAcceptedScreen;
