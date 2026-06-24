import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { jobAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import CustomLoader from '../../components/CustomLoader';

const FarmerWorkerProfileScreen = ({ route, navigation }) => {
  const { worker, cropId, cropName, operationId, operationName, skillKeyword, acreage } = route.params || {};
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Parse JSON fields safely
  const parseJson = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch (e) {
      return null;
    }
  };

  const skillsList = worker.skillsList || parseJson(worker.skills) || [];
  const cropExp = worker.cropExp || parseJson(worker.cropExperience) || {};

  const handleHireWorker = async () => {
    setLoading(true);
    try {
      // Get location coordinates
      let lat = 17.385044;
      let lng = 78.486671;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      // Create Direct Hired Job on backend
      const jobData = {
        workType: operationName || 'Labour',
        workerType: 'individual',
        workersNeeded: 1,
        payPerDay: worker.dailyWage || 500,
        farmLatitude: lat,
        farmLongitude: lng,
        farmAddress: user?.village || 'My Farm',
        description: `Direct Hire for ${cropName || ''} ${operationName || ''}`,
        workerIds: [worker.id],
      };

      const response = await jobAPI.createJob(jobData);
      if (response.success) {
        navigation.navigate('Payment', {
          job: response.data,
          worker: worker,
          isNewHire: true,
        });
      } else {
        Alert.alert('Error', response.message || 'Failed to hire worker.');
      }
    } catch (err) {
      console.log('Error hiring worker:', err);
      Alert.alert('Error', 'Failed to create job offer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Immersive Profile Header */}
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('workerProfile.title') || 'Worker Profile'}</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.profileSummary}>
          <Image
            source={{ uri: worker.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop' }}
            style={styles.avatar}
          />
          <Text style={styles.workerName}>{worker.name || 'Worker'}</Text>
          
          <View style={styles.statsRow}>
            {worker.ratingAvg > 0 && (
              <View style={styles.statBox}>
                <MaterialIcons name="star" size={18} color="#F59E0B" />
                <Text style={styles.statVal}>{worker.ratingAvg.toFixed(1)} / 5</Text>
              </View>
            )}
            <View style={styles.statBox}>
              <MaterialIcons name="work" size={18} color="#94A3B8" />
              <Text style={styles.statVal}>
                {worker.experience ? `${worker.experience} Years` : 'Experienced'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <CustomLoader size={48} color={colors.primary} />
          <Text style={styles.loadingText}>Initiating job booking...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Daily Wage Card */}
          <View style={styles.wageCard}>
            <Text style={styles.wageTitle}>Expected Daily Wage</Text>
            <Text style={styles.wageValue}>₹{worker.dailyWage || 500} <Text style={styles.wageUnit}>/ day</Text></Text>
          </View>

          {/* Details Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MaterialIcons name="place" size={20} color="#64748B" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>{t('workerProfile.locationLabel') || 'Location'}</Text>
                <Text style={styles.infoVal}>
                  {worker.distanceKm != null ? `${worker.distanceKm} km away` : 'Nearby'}
                </Text>
              </View>
            </View>
          </View>

          {/* Skills Section */}
          {skillsList.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('workerProfile.skills') || 'Skills'}</Text>
              <View style={styles.chipContainer}>
                {skillsList.map((skill, index) => (
                  <View key={index} style={styles.chip}>
                    <Text style={styles.chipText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Crop Experience Section */}
          {Object.keys(cropExp).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('workerProfile.cropExperience') || 'Crop Experience'}</Text>
              {Object.entries(cropExp).map(([crop, years]) => (
                <View key={crop} style={styles.cropExpRow}>
                  <Text style={styles.cropName}>
                    {crop.charAt(0).toUpperCase() + crop.slice(1)}
                  </Text>
                  <Text style={styles.cropYears}>
                    {years} {years === 1 ? 'year' : 'years'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Sticky Bottom Hire Button */}
      {!loading && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.hireButton}
            onPress={handleHireWorker}
          >
            <LinearGradient
              colors={colors.primaryGradient || ['#10B981', '#059669']}
              style={styles.hireGradient}
            >
              <MaterialIcons name="bolt" size={24} color="#FFF" />
              <Text style={styles.hireText}>
                {t('workerProfile.hireWorkerBtn') || 'HIRE WORKER'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: { paddingTop: 4 },
      android: { paddingTop: 20 },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  profileSummary: {
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 8,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#38BDF8',
    backgroundColor: '#334155',
  },
  workerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  wageCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  wageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  wageValue: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 6,
  },
  wageUnit: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTextContainer: {
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  infoVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  cropExpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cropName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  cropYears: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  hireButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  hireGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hireText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default FarmerWorkerProfileScreen;
