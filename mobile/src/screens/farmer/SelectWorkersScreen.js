// Screen 8: Select Workers - Exact match to worker-type-count.html
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { jobService } from '../../services/api/jobService';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import * as Location from 'expo-location';

const SelectWorkersScreen = ({ navigation, route }) => {
  const { workType } = route.params;
  const user = useAuthStore((state) => state.user);
  const [workerType, setWorkerType] = useState('group'); // 'individual' or 'group'
  const [workersNeeded, setWorkersNeeded] = useState(10);
  const [payPerDay, setPayPerDay] = useState('500');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';


  const handleIncrement = () => {
    if (workersNeeded < 200) setWorkersNeeded(workersNeeded + 1);
  };

  const handleDecrement = () => {
    if (workersNeeded > 1) {
      setWorkersNeeded(workersNeeded - 1);
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
    if (!parsedPay || parsedPay < 100 || parsedPay > 5000) {
      Alert.alert('Invalid Amount', 'Pay per day must be between ₹100 and ₹5000.');
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
        workType: workType.toLowerCase(),
        workerType,
        workersNeeded,
        payPerDay: parsedPay,
        farmAddress: user.village || 'Hyderabad',
        farmLatitude: latitude || 17.385044,
        farmLongitude: longitude || 78.486671,
      };

      const response = await jobService.createJob(jobData);

      if (response.success) {
        const jobObj = response.data.data || response.data;
        navigation.navigate('RequestSent', {
          job: { ...jobObj, workersNeeded, payPerDay: parsedPay },
        });
      } else {
        Alert.alert('Error', response.message || 'Failed to create job');
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
      
      {/* Spacer for translucent status bar */}
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

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

        {/* Section: Pay Per Day */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pay Per Day</Text>
          <Text style={styles.sectionSubtitle}>Enter amount in Rupees</Text>
        </View>

        <View style={styles.payInputContainer}>
          <View style={styles.payInputCard}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.payInput}
              value={payPerDay}
              onChangeText={setPayPerDay}
              keyboardType="numeric"
              placeholder="500"
              placeholderTextColor="#9CA3AF"
            />
          </View>
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
              <ActivityIndicator color="#FFFFFF" size="small" />
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
    padding: 16,
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
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#131811',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 15,
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
    fontWeight: '800',
    color: '#131811',
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
