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

const GroupSetupScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const language = useAuthStore((state) => state.language) || 'en';
  const [groupName, setGroupName] = useState('');
  const [memberCount, setMemberCount] = useState(5);

  const handleCreateGroup = () => {
    if (!groupName) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    navigation.navigate('GroupJobOffer', { groupName, memberCount });
  };

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
          <Text style={styles.inputLabel}>{t('leader.groupName')}</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter group name..."
            placeholderTextColor="#9CA3AF"
            value={groupName}
            onChangeText={setGroupName}
          />
        </View>

        <View style={styles.counterCard}>
          <Text style={styles.counterLabel}>{t('leader.members')}</Text>
          <View style={styles.counter}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => setMemberCount(Math.max(2, memberCount - 1))}
            >
              <MaterialIcons name="remove" size={32} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{memberCount}</Text>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => setMemberCount(memberCount + 1)}
            >
              <MaterialIcons name="add" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            You'll be able to add members after creating the group
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateGroup}
          activeOpacity={0.9}
        >
          <Text style={styles.createButtonText}>{t('leader.createGroup').toUpperCase()}</Text>
          <MaterialIcons name="arrow-forward" size={24} color={colors.backgroundDark} />
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
    fontSize: 24,
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
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
    marginTop: 16,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#131811',
    borderWidth: 2,
    borderColor: `${colors.primary}33`,
  },
  counterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  counterLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131811',
    marginBottom: 24,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  counterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    minWidth: 80,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: `${colors.primary}0D`,
    padding: 16,
    borderRadius: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6f8961',
    lineHeight: 20,
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
  createButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.backgroundDark,
  },
});

export default GroupSetupScreen;
