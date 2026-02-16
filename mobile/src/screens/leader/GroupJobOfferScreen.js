// Screen 27: Group Job Offer - Leader accepts job for group
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors } from '../../theme/colors';

const GroupJobOfferScreen = ({ navigation, route }) => {
  const { groupName, memberCount } = route.params;
  const job = {
    workType: 'Harvesting',
    payPerDay: 500,
    totalPay: 500 * memberCount,
    duration: '1 day',
    farmAddress: 'Gachibowli, Hyderabad',
  };

  useEffect(() => {
    Speech.speak('Group job offer received', { language: 'en' });
  }, []);

  const handleAccept = () => {
    Speech.speak('Job accepted', { language: 'en' });
    navigation.navigate('GroupQRAttendance', { job, groupName, memberCount });
  };

  const handleReject = () => {
    Alert.alert('Job Rejected', 'Looking for more jobs...');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Group Job Offer</Text>
        <Text style={styles.headerSubtitle}>గ్రూప్ ఉద్యోగం</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.groupBadge}>
          <MaterialIcons name="groups" size={32} color={colors.primary} />
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.memberCount}>{memberCount} members</Text>
        </View>

        <View style={styles.jobCard}>
          <View style={styles.jobRow}>
            <MaterialIcons name="work" size={28} color={colors.primary} />
            <View style={styles.jobInfo}>
              <Text style={styles.jobLabel}>Work Type</Text>
              <Text style={styles.jobValue}>{job.workType}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.jobRow}>
            <MaterialIcons name="payments" size={28} color={colors.primary} />
            <View style={styles.jobInfo}>
              <Text style={styles.jobLabel}>Total Pay</Text>
              <Text style={styles.jobValue}>₹{job.totalPay}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.jobRow}>
            <MaterialIcons name="schedule" size={28} color={colors.primary} />
            <View style={styles.jobInfo}>
              <Text style={styles.jobLabel}>Duration</Text>
              <Text style={styles.jobValue}>{job.duration}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.jobRow}>
            <MaterialIcons name="location-on" size={28} color={colors.primary} />
            <View style={styles.jobInfo}>
              <Text style={styles.jobLabel}>Location</Text>
              <Text style={styles.jobValue}>{job.farmAddress}</Text>
            </View>
          </View>
        </View>

        <View style={styles.voiceHint}>
          <MaterialIcons name="volume-up" size={20} color={colors.primary} />
          <Text style={styles.voiceText}>Accept or reject this job offer</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={handleReject}
          activeOpacity={0.9}
        >
          <MaterialIcons name="close" size={24} color="#FFFFFF" />
          <Text style={styles.rejectButtonText}>REJECT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAccept}
          activeOpacity={0.9}
        >
          <MaterialIcons name="check" size={24} color={colors.backgroundDark} />
          <Text style={styles.acceptButtonText}>ACCEPT</Text>
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
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.backgroundDark,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.backgroundDark,
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  groupBadge: {
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131811',
    marginTop: 12,
  },
  memberCount: {
    fontSize: 16,
    color: '#6f8961',
    marginTop: 4,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  jobInfo: {
    flex: 1,
  },
  jobLabel: {
    fontSize: 14,
    color: '#6f8961',
    marginBottom: 4,
  },
  jobValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: `${colors.primary}0D`,
    padding: 16,
    borderRadius: 16,
  },
  voiceText: {
    fontSize: 14,
    color: '#6f8961',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'rgba(246, 248, 246, 0.95)',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#EF4444',
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  rejectButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    height: 64,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.backgroundDark,
  },
});

export default GroupJobOfferScreen;
