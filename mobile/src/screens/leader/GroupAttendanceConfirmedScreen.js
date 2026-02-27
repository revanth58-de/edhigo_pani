import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import * as Speech from 'expo-speech';

const GroupAttendanceConfirmedScreen = ({ navigation, route }) => {
  const { job, groupId, type } = route.params;

  useEffect(() => {
    const msg = type === 'IN' ? "Check-in successful" : "Check-out successful";
    Speech.speak(msg, { language: 'en' });
  }, []);

  const handleContinue = () => {
    if (type === 'IN') {
      // Go to G9 flow (Work in progress) -> which eventually leads to G9 OUT
      navigation.navigate('GroupWorkStatus', { job, groupId });
    } else {
      // Go to G10 (Rating)
      navigation.navigate('RateFarmerLeader', { job, groupId });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.successCard}>
        <View style={styles.checkInner}>
          <MaterialIcons name="check" size={80} color="#FFF" />
        </View>
        <Text style={styles.successTitle}>
          {type === 'IN' ? 'CHECK-IN DONE' : 'CHECK-OUT DONE'}
        </Text>
        <Text style={styles.successSub}>
          Attendance recorded for all members.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleContinue}
      >
        <Text style={styles.continueText}>CONTINUE</Text>
        <MaterialIcons name="arrow-forward" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', padding: 24 },
  successCard: { alignItems: 'center', marginBottom: 60 },
  checkInner: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 32, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  successSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 12 },
  continueButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 99 },
  continueText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 }
});

export default GroupAttendanceConfirmedScreen;
