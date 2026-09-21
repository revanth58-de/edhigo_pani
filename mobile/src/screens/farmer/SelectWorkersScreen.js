import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomLoader from '../../components/CustomLoader';
import { LinearGradient } from 'expo-linear-gradient';
import { jobService } from '../../services/api/jobService';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { fetchWageRates, getBenchmarkWage, getCachedWageRates } from '../../utils/wageHelper';
import * as Location from 'expo-location';

const SelectWorkersScreen = ({ navigation, route }) => {
  const {
    workType,
    repostJob,
    workersNeeded: routeWorkersNeeded,
    durationDays: routeDurationDays,
    suggestedWage,
    minDailyWage: routeMinWage,
    cropId,
    operationId,
    skillKeyword,
  } = route?.params || {};

  const user = useAuthStore((state) => state.user);
  const initialBenchmark = suggestedWage || getBenchmarkWage({ cropId, operationId, skillKeyword });
  const [workerType, setWorkerType] = useState(repostJob?.workerType || 'group'); // 'individual' or 'group'
  const [workersNeeded, setWorkersNeeded] = useState(repostJob?.workersNeeded || routeWorkersNeeded || 10);
  const [durationDays, setDurationDays] = useState(repostJob?.durationDays || routeDurationDays || 1);
  const [payPerDay, setPayPerDay] = useState(repostJob?.payPerDay ? String(repostJob.payPerDay) : String(initialBenchmark || '500'));
  const [wageRates, setWageRates] = useState(getCachedWageRates());
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';

  useEffect(() => {
    fetchWageRates().then((rates) => {
      if (rates) {
        setWageRates(rates);
        if (!repostJob?.payPerDay && !suggestedWage) {
          const resolved = getBenchmarkWage({ cropId, operationId, skillKeyword, rates });
          setPayPerDay(String(resolved));
        }
      }
    });
  }, [cropId, operationId, skillKeyword, repostJob, suggestedWage]);

  const handleIncrement = () => {
    if (workersNeeded < 200) setWorkersNeeded(workersNeeded + 1);
  };

  const handleDecrement = () => {
    if (workersNeeded > 1) {
      setWorkersNeeded(workersNeeded - 1);
    }
  };

  const handleDurationIncrement = () => {
    if (durationDays < 30) setDurationDays(durationDays + 1);
  };

  const handleDurationDecrement = () => {
    if (durationDays > 1) {
      setDurationDays(durationDays - 1);
    }
  };

  const handleQuickSelect = (count) => {
    setWorkersNeeded(count);
  };

  const handleFindWorkers = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No user found. Please log in again.');
      return;
    }

    const parsedPay = parseInt(payPerDay, 10);
    const minFloor = wageRates.enforceMinimum ? (wageRates.minDailyWage || 400) : 100;
    if (!parsedPay || parsedPay < minFloor || parsedPay > 10000) {
      Alert.alert(
        'Invalid Amount',
        `Pay per day cannot be less than the minimum wage rate of ₹${minFloor} configured for the platform.`
      );
      return;
    }

    setLoading(true);
    try {
      let latitude = user.latitude;
      let longitude = user.longitude;

      // Try to get fresh location for accuracy
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation
          });
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      } catch (locErr) {
        console.warn('Could not get fresh location, falling back to profile');
      }

      // Create job posting
      const jobData = {
        farmerId: user.id,
        workType: (workType || repostJob?.workType || '').toLowerCase(),
        workerType,
        workersNeeded,
        payPerDay: parsedPay,
        farmAddress: user.village || 'Hyderabad',
        farmLatitude: latitude || 17.385044,
        farmLongitude: longitude || 78.486671,
        durationDays,
      };

      const response = await jobService.createJob(jobData);

      if (response.data?.success) {
        const jobObj = response.data?.data || response.data;
        navigation.navigate('RequestSent', {
          job: { ...jobObj, workersNeeded, payPerDay: parsedPay },
        });
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to create job');
      }
    } catch (error) {
      console.error('Create Job Error:', error);
      Alert.alert('Error', 'Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient 
      colors={['#FDFBF7', colors.backgroundLight]} 
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={28} color="#131811" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('selectWorkers.title')}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Section: Who do you need? */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('selectWorkers.howManyWorkers')}</Text>
          <Text style={styles.sectionSubtitle}>{t('selectWorkers.title')}</Text>
        </View>

        {/* Worker Type Selection */}
        <View style={styles.workerTypeGrid}>
          <TouchableOpacity
            style={[
              styles.workerTypeCard,
              workerType === 'individual' && styles.workerTypeCardSelected,
            ]}
            onPress={() => setWorkerType('individual')}
            activeOpacity={0.9}
          >
            <View style={[
              styles.workerTypeIcon,
              workerType === 'individual' && styles.workerTypeIconSelected,
            ]}>
              <MaterialIcons
                name="person"
                size={72}
                color={workerType === 'individual' ? '#FFFFFF' : colors.primary}
              />
            </View>
            <Text style={styles.workerTypeText}>{t('selectWorkers.individual')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.workerTypeCard,
              workerType === 'group' && styles.workerTypeCardSelected,
            ]}
            onPress={() => setWorkerType('group')}
            activeOpacity={0.9}
          >
            <View style={[
              styles.workerTypeIcon,
              workerType === 'group' && styles.workerTypeIconSelected,
            ]}>
              <MaterialIcons
                name="group"
                size={72}
                color={workerType === 'group' ? '#FFFFFF' : colors.primary}
              />
            </View>
            <Text style={styles.workerTypeText}>{t('selectWorkers.group')}</Text>
          </TouchableOpacity>
        </View>

        {/* Section: How many? */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('selectWorkers.howManyWorkers')}</Text>
        </View>

        {/* Stepper */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepperCard}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={handleDecrement}
            >
              <MaterialIcons name="remove" size={40} color="#131811" />
            </TouchableOpacity>

            <View style={styles.stepperValue}>
              <Text style={styles.stepperNumber}>{workersNeeded}</Text>
              <Text style={styles.stepperLabel}>{t('common.workers')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.stepperButton, styles.stepperButtonPrimary]}
              onPress={handleIncrement}
            >
              <MaterialIcons name="add" size={40} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Selection Chips */}
        <View style={styles.quickSelectContainer}>
          {[5, 10, 20, 50].map((count) => (
            <TouchableOpacity
              key={count}
              style={[
                styles.quickSelectChip,
                workersNeeded === count && styles.quickSelectChipActive,
              ]}
              onPress={() => handleQuickSelect(count)}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.quickSelectText,
                  workersNeeded === count && styles.quickSelectTextActive,
                ]}
              >
                {count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section: Job Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Duration</Text>
          <Text style={styles.sectionSubtitle}>Specify how many days the work will last</Text>
        </View>

        {/* Duration Stepper */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepperCard}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={handleDurationDecrement}
              testID="duration-decrement-btn"
            >
              <MaterialIcons name="remove" size={40} color="#131811" />
            </TouchableOpacity>

            <View style={styles.stepperValue}>
              <Text style={styles.stepperNumber} testID="duration-value-text">{durationDays}</Text>
              <Text style={styles.stepperLabel}>Days</Text>
            </View>

            <TouchableOpacity
              style={[styles.stepperButton, styles.stepperButtonPrimary]}
              onPress={handleDurationIncrement}
              testID="duration-increment-btn"
            >
              <MaterialIcons name="add" size={40} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Pay Per Day */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Pay Per Day</Text>
            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>
                Benchmark: ₹{suggestedWage || getBenchmarkWage({ cropId, operationId, skillKeyword, rates: wageRates })}/day
              </Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            Platform Min Floor: ₹{wageRates.minDailyWage || 400}/day
          </Text>
        </View>

        <View style={styles.payInputContainer}>
          <View style={styles.payInputCard}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.payInput}
              value={payPerDay}
              onChangeText={setPayPerDay}
              keyboardType="numeric"
              placeholder={String(suggestedWage || '500')}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Quick Wage Presets */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 8, marginBottom: 16 }}>
          {[
            Math.max(wageRates.minDailyWage || 400, (parseInt(payPerDay, 10) || 500) - 50),
            parseInt(payPerDay, 10) || 500,
            (parseInt(payPerDay, 10) || 500) + 50,
            (parseInt(payPerDay, 10) || 500) + 100,
          ].filter((v, i, arr) => arr.indexOf(v) === i).map((amt) => (
            <TouchableOpacity
              key={amt}
              onPress={() => setPayPerDay(String(amt))}
              style={{
                flex: 1,
                paddingVertical: 8,
                backgroundColor: String(payPerDay) === String(amt) ? '#16A34A' : '#F1F5F9',
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: String(payPerDay) === String(amt) ? '#16A34A' : '#E2E8F0',
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: String(payPerDay) === String(amt) ? '#FFF' : '#334155',
              }}>
                ₹{amt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Find Workers Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.findButtonWrap, loading && { opacity: 0.7 }]}
          onPress={handleFindWorkers}
          disabled={loading}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={colors.primaryGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.findButton}
          >
            {loading ? (
              <CustomLoader size={20} color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.findButtonText}>{t('selectWorkers.findWorkers')}</Text>
                <MaterialIcons name="trending-flat" size={24} color="#FFFFFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: Platform.OS === 'ios' ? 44 : Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#131811',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '900',
    color: '#131811',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  sectionSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6f8961',
    marginTop: 6,
    fontWeight: '600',
  },
  workerTypeGrid: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
  },
  workerTypeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  workerTypeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  workerTypeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerTypeIconSelected: {
    backgroundColor: colors.primary,
  },
  workerTypeText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: '#131811',
    textAlign: 'center',
  },
  stepperContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  stepperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  stepperButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonPrimary: {
    backgroundColor: colors.primary,
  },
  stepperValue: {
    alignItems: 'center',
  },
  stepperNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: colors.primary,
    width: 140,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  quickSelectContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  quickSelectChip: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    alignItems: 'center',
  },
  quickSelectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickSelectText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6B7280',
  },
  quickSelectTextActive: {
    color: '#FFFFFF',
  },
  payInputContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  payInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    gap: 16,
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primary,
  },
  payInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '900',
    color: '#131811',
    padding: 0,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: 'transparent',
  },
  findButtonWrap: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  findButton: {
    flexDirection: 'row',
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  findButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default SelectWorkersScreen;
