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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';


  const handleIncrement = () => {
    setWorkersNeeded(workersNeeded + 1);
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

    try {
      let latitude = user.latitude;
      let longitude = user.longitude;

      // Try to get fresh location for accuracy
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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
        payPerDay: 500, // Default, could be made configurable
        farmAddress: user.village || 'Hyderabad',
        farmLatitude: latitude || 17.385044,
        farmLongitude: longitude || 78.486671,
      };

      const response = await jobService.createJob(jobData);

      if (response.success) {
        // response.data is the full response body: { success, message, data: jobObj }
        const jobObj = response.data.data || response.data;
        navigation.navigate('RequestSent', {
          job: { ...jobObj, workersNeeded, payPerDay: 500 },
        });
      } else {
        Alert.alert('Error', response.message || 'Failed to create job');
      }
    } catch (error) {
      console.error('Create Job Error:', error);
      Alert.alert('Error', 'Failed to create job. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
            />
          </View>
        </View>
      </ScrollView>

      {/* Find Workers Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.findButton}
          onPress={handleFindWorkers}
          activeOpacity={0.9}
        >
          <Text style={styles.findButtonText}>{t('selectWorkers.findWorkers')}</Text>
          <MaterialIcons name="trending-flat" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
    flex: 1,
    textAlign: 'center',
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}33`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131811',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6f8961',
    marginTop: 4,
  },
  workerTypeGrid: {
    flexDirection: 'row',
    gap: 16,
    padding: 16,
  },
  workerTypeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 4,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  workerTypeCardSelected: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  workerTypeIcon: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerTypeIconSelected: {
    backgroundColor: colors.primary,
  },
  workerTypeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
  },
  stepperContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stepperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepperButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonPrimary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stepperValue: {
    alignItems: 'center',
  },
  stepperNumber: {
    fontSize: 60,
    fontWeight: 'bold',
    color: colors.primary,
    width: 128,
    textAlign: 'center',
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9CA3AF',
    letterSpacing: 2,
    marginTop: 8,
  },
  quickSelectContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  quickSelectChip: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    borderRadius: 9999,
    alignItems: 'center',
  },
  quickSelectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  quickSelectText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
  },
  quickSelectTextActive: {
    color: '#FFFFFF',
  },
  payInputContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  payInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  payInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#131811',
    padding: 0, // Remove default padding
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 40,
    backgroundColor: colors.backgroundLight,
  },
  findButton: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  findButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default SelectWorkersScreen;
