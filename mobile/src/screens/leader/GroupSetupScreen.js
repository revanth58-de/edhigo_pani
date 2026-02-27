// Screen 26: Group Setup - Leader creates group
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
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import { groupAPI } from '../../services/api';

const GroupSetupScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [groupName, setGroupName] = useState('');
  const [memberCount, setMemberCount] = useState(5);
  const [wageType, setWageType] = useState('per_day'); // 'per_day' | 'per_acre'

  const handleContinue = async () => {
    if (!groupName) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    try {
      const res = await groupAPI.createGroup({
        name: groupName,
        memberCount: memberCount
      });
      navigation.navigate('ManageGroup', {
        groupId: res.data.group.id,
        groupName: groupName
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const quickOptions = [5, 10, 15, 20];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={colors.backgroundDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('leader.createGroup')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.inputCard}>
          <MaterialIcons name="groups" size={48} color={colors.primary} />
          <Text style={styles.inputLabel}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter group name..."
            placeholderTextColor="#9CA3AF"
            value={groupName}
            onChangeText={setGroupName}
          />
        </View>

        <View style={styles.counterCard}>
          <Text style={styles.counterLabel}>Member Count</Text>
          <View style={styles.counter}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => setMemberCount(Math.max(1, memberCount - 1))}
            >
              <MaterialIcons name="remove" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{memberCount}</Text>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => setMemberCount(memberCount + 1)}
            >
              <MaterialIcons name="add" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.quickOptions}>
            {quickOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.quickOption, memberCount === opt && styles.quickOptionActive]}
                onPress={() => setMemberCount(opt)}
              >
                <Text style={[styles.quickOptionText, memberCount === opt && styles.quickOptionTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.wageCard}>
          <Text style={styles.wageLabel}>Wage Type</Text>
          <View style={styles.wageOptions}>
            <TouchableOpacity
              style={[styles.wageOption, wageType === 'per_day' && styles.wageOptionActive]}
              onPress={() => setWageType('per_day')}
            >
              <MaterialIcons
                name="payments"
                size={24}
                color={wageType === 'per_day' ? '#FFF' : colors.primary}
              />
              <Text style={[styles.wageOptionText, wageType === 'per_day' && styles.wageOptionTextActive]}>
                💰 Per Day
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.wageOption, wageType === 'per_acre' && styles.wageOptionActive]}
              onPress={() => setWageType('per_acre')}
            >
              <MaterialIcons
                name="grass"
                size={24}
                color={wageType === 'per_acre' ? '#FFF' : colors.primary}
              />
              <Text style={[styles.wageOptionText, wageType === 'per_acre' && styles.wageOptionTextActive]}>
                🌾 Per Acre
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <Text style={styles.createButtonText}>CONFIRM</Text>
          <MaterialIcons name="check-circle" size={24} color={colors.backgroundDark} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.backgroundDark,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 12,
    marginBottom: 12,
  },
  input: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  counterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
  },
  counterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.primary,
    minWidth: 60,
    textAlign: 'center',
  },
  quickOptions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  quickOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  quickOptionTextActive: {
    color: '#FFFFFF',
  },
  wageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    elevation: 4,
  },
  wageLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  wageOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  wageOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  wageOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  wageOptionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
  },
  wageOptionTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'rgba(246, 248, 246, 0.95)',
  },
  createButton: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: colors.primary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    elevation: 8,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.backgroundDark,
  },
});

export default GroupSetupScreen;
