import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { jobAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import CustomLoader from '../../components/CustomLoader';

const AvailableWorkersScreen = ({ route, navigation }) => {
  const { cropId, cropName, operationId, operationName, skillKeyword, acreage, workersNeeded } = route.params || {};
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      // 1. Get farmer location if possible
      let lat = 17.385044; // Fallback Rajesh default
      let lng = 78.486671;
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      // 2. Fetch workers
      const response = await jobAPI.getNearbyWorkers({ latitude: lat, longitude: lng, radius: 50 });
      if (response.data?.success && Array.isArray(response.data?.workers)) {
        setWorkers(response.data.workers);
      } else if (response.data?.workers) {
        setWorkers(response.data.workers);
      } else if (Array.isArray(response.data)) {
        setWorkers(response.data);
      } else {
        setWorkers([]);
      }
    } catch (error) {
      console.log('Error fetching workers:', error);
      Alert.alert('Error', 'Failed to fetch available workers.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse JSON fields safely
  const parseJson = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch (e) {
      return null;
    }
  };

  // Filter and rank workers
  const processedWorkers = workers.map(w => {
    const skillsList = parseJson(w.skills) || [];
    const cropExp = parseJson(w.cropExperience) || {};
    
    const matchesSkill = !skillKeyword || skillsList.map(s => s.toLowerCase()).some(s => 
      s === skillKeyword.toLowerCase() || 
      (operationName && s === operationName.toLowerCase()) || 
      (operationId && s === operationId.toLowerCase())
    );
    const expYears = cropExp[cropId.toLowerCase()] || 0;
    const hasCropExp = expYears > 0;

    return {
      ...w,
      skillsList,
      cropExp,
      matchesSkill,
      expYears,
      hasCropExp,
    };
  }).filter(w => w.matchesSkill);

  // Split into sections
  const bestMatchList = processedWorkers.filter(w => w.hasCropExp && (w.ratingAvg >= 4.5 || w.ratingAvg === 0));
  const recentList = processedWorkers.filter(w => w.hasCropExp && w.ratingAvg < 4.5 && w.ratingAvg > 0);
  const otherList = processedWorkers.filter(w => !w.hasCropExp);

  const toggleSelectWorker = (id) => {
    setSelectedWorkerIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleHireGroup = async () => {
    if (selectedWorkerIds.length === 0) return;

    setLoading(true);
    try {
      const selectedWorkersList = workers.filter(w => selectedWorkerIds.includes(w.id));
      const totalWageVal = selectedWorkersList.reduce((sum, w) => sum + (w.dailyWage || 500), 0);
      const averageWage = totalWageVal / selectedWorkersList.length;

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
        workType: operationName,
        workerType: 'individual',
        workersNeeded: selectedWorkerIds.length,
        payPerDay: averageWage,
        farmLatitude: lat,
        farmLongitude: lng,
        farmAddress: user?.village || 'My Farm',
        description: `Direct Hire for ${cropName} ${operationName}`,
        workerIds: selectedWorkerIds,
      };

      const response = await jobAPI.createJob(jobData);
      if (response.data?.success) {
        navigation.navigate('Payment', {
          job: response.data.data || response.data.job,
          workers: selectedWorkersList,
          isNewHire: true,
        });
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to initiate hire.');
      }
    } catch (err) {
      console.log('Error hiring group:', err);
      Alert.alert('Error', 'Failed to create job offer.');
    } finally {
      setLoading(false);
    }
  };

  const renderWorkerCard = (w, badgeText, badgeColor) => {
    const isSelected = selectedWorkerIds.includes(w.id);
    return (
      <TouchableOpacity
        key={w.id}
        style={[styles.workerCard, isSelected && styles.workerCardSelected]}
        onPress={() => navigation.navigate('FarmerWorkerProfile', {
          worker: w,
          cropId,
          cropName,
          operationId,
          operationName,
          skillKeyword,
          acreage,
        })}
        activeOpacity={0.8}
      >
        <View style={styles.workerRow}>
          <TouchableOpacity onPress={() => toggleSelectWorker(w.id)} style={styles.checkbox}>
            <MaterialIcons
              name={isSelected ? "check-box" : "checkbox-blank-outline"}
              size={26}
              color={isSelected ? colors.primary : '#64748B'}
            />
          </TouchableOpacity>

          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: w.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop' }}
              style={styles.avatar}
            />
            {w.ratingAvg > 0 && (
              <View style={styles.ratingBadge}>
                <MaterialIcons name="star" size={10} color="#F59E0B" />
                <Text style={styles.ratingText}>{w.ratingAvg.toFixed(1)}</Text>
              </View>
            )}
          </View>

          <View style={styles.workerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.workerName}>{w.name || 'Worker'}</Text>
              {badgeText && (
                <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                  <Text style={styles.badgeText}>{badgeText}</Text>
                </View>
              )}
            </View>
            <Text style={styles.workerDetails}>
              {w.expYears ? `${w.expYears} yrs crop exp` : 'General agricultural experience'}
            </Text>
            <Text style={styles.workerLoc}>
              📍 {w.distanceKm != null ? `${w.distanceKm} km away` : 'Nearby'}
            </Text>
          </View>

          <View style={styles.wageContainer}>
            <Text style={styles.wageValue}>₹{w.dailyWage || 500}</Text>
            <Text style={styles.wageUnit}>/day</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedWorkersCount = selectedWorkerIds.length;
  const totalWage = workers
    .filter(w => selectedWorkerIds.includes(w.id))
    .reduce((sum, w) => sum + (w.dailyWage || 500), 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={28} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('availableWorkers.title') || 'Available Workers'}</Text>
          <Text style={styles.headerSubtitle}>{cropName} ➔ {operationName}</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {loading && workers.length === 0 ? (
        <View style={styles.center}>
          <CustomLoader size={48} color={colors.primary} />
          <Text style={styles.loadingText}>Searching nearby workers...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Best Match List */}
          {bestMatchList.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('availableWorkers.bestMatch') || 'AI Recommended'}</Text>
              {bestMatchList.map(w => renderWorkerCard(w, 'Best Match', '#10B981'))}
            </View>
          )}

          {/* Recent Hired List */}
          {recentList.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('availableWorkers.recentWorkers') || 'Previously Hired'}</Text>
              {recentList.map(w => renderWorkerCard(w, 'Recent', '#3B82F6'))}
            </View>
          )}

          {/* Other List */}
          {otherList.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('availableWorkers.otherWorkers') || 'Nearby Available'}</Text>
              {otherList.map(w => renderWorkerCard(w, null, null))}
            </View>
          )}

          {processedWorkers.length === 0 && (
            <View style={styles.noWorkersContainer}>
              <MaterialIcons name="people-outline" size={60} color="#94A3B8" />
              <Text style={styles.noWorkersText}>{t('availableWorkers.noWorkers') || 'No matching workers found nearby.'}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Sticky Bottom Bar for Group Hiring */}
      {selectedWorkersCount > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarInfo}>
            <Text style={styles.bottomBarCount}>{selectedWorkersCount} Selected</Text>
            <Text style={styles.bottomBarWage}>Total: ₹{totalWage}/day</Text>
          </View>
          <TouchableOpacity
            style={styles.hireGroupButton}
            onPress={handleHireGroup}
            disabled={loading}
          >
            <LinearGradient
              colors={colors.primaryGradient || ['#10B981', '#059669']}
              style={styles.hireGroupGradient}
            >
              <Text style={styles.hireGroupText}>
                {t('availableWorkers.hireGroup', { count: selectedWorkersCount }) || `Hire Group (${selectedWorkersCount})`}
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  workerCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}05`,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 10,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ratingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1E293B',
    marginLeft: 2,
  },
  workerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },
  workerLoc: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  workerDetails: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  wageContainer: {
    alignItems: 'flex-end',
  },
  wageValue: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.primary,
  },
  wageUnit: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  noWorkersContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  noWorkersText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  bottomBarInfo: {
    flexDirection: 'column',
  },
  bottomBarCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  bottomBarWage: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  hireGroupButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  hireGroupGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hireGroupText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
});

export default AvailableWorkersScreen;
