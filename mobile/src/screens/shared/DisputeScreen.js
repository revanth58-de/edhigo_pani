import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { disputeService } from '../../services/api';
import useSpeech from '../../hooks/useSpeech';
import CustomLoader from '../../components/CustomLoader';

const CATEGORIES = ['incorrect_payment', 'hours_mismatch', 'worker_no_show', 'other'];

const DisputeScreen = ({ navigation, route }) => {
  const { jobId, paymentId } = route.params || {};
  const { t } = useTranslation();
  const { speak, stop } = useSpeech();

  const [category, setCategory] = useState('incorrect_payment');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Play voice prompt on mount
  useEffect(() => {
    playVoiceGuide();
    return () => stop();
  }, []);

  const playVoiceGuide = () => {
    // Play localized voice prompt
    const text = t('disputes.selectCategory') + '. ' + t('disputes.descriptionPlaceholder');
    speak(text);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert(t('common.error') || 'Error', t('disputes.descriptionPlaceholder') || 'Please enter details');
      return;
    }

    setLoading(true);
    try {
      const res = await disputeService.fileDispute({
        jobId,
        paymentId,
        category,
        description,
      });

      if (res.success) {
        Alert.alert(
          t('common.success') || 'Success',
          t('disputes.successMsg') || 'Dispute submitted successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(t('common.error') || 'Error', res.message || 'Failed to file dispute');
      }
    } catch (err) {
      Alert.alert(t('common.error') || 'Error', err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <MaterialIcons name="arrow-back-ios" size={24} color="#131811" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('disputes.title')}</Text>
        <TouchableOpacity onPress={playVoiceGuide} style={styles.voiceIcon}>
          <MaterialIcons name="volume-up" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Category selection */}
        <Text style={styles.label}>{t('disputes.selectCategory')}</Text>
        <View style={styles.categoriesContainer}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextActive,
                  ]}
                >
                  {t(`disputes.${cat}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description Input */}
        <Text style={styles.label}>{t('disputes.descriptionLabel')}</Text>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={6}
          placeholder={t('disputes.descriptionPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        {/* Submit Button */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <CustomLoader size={36} color={colors.primary} />
          </View>
        ) : (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
            <MaterialIcons name="send" size={20} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>{t('disputes.submitDispute')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131811',
    flex: 1,
    textAlign: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  voiceIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  scroll: {
    padding: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 120,
    marginBottom: 32,
  },
  submitBtn: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
});

export default DisputeScreen;
