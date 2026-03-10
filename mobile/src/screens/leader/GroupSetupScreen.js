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
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';
import useAuthStore from '../../store/authStore';
import { groupAPI } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';

const GROUP_TYPES = [
  { id: 'General', icon: 'groups' },
  { id: 'Seasonal', icon: 'eco' },
  { id: 'Specialized', icon: 'precision-manufacturing' },
];

const GroupSetupScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState('General');
  const [memberCount, setMemberCount] = useState(5);
  const [photoUri, setPhotoUri] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to upload a photo.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Image picker error:', error);
    }
  };

  const handleContinue = async () => {
    if (!groupName) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // In a full implementation, you would upload the photoUri to S3/Cloudinary here
      // and get a remote URL back to pass as photoUrl.
      // For this step, we mock uploading and just pass the local URI or omit it if not real backend handling is setup yet.
      
      const res = await groupAPI.createGroup({
        name: groupName,
        type: groupType,
        description: description,
        photoUrl: photoUri || null, // pass null if no photo picked
        memberCount: memberCount
      });
      
      navigation.navigate('ManageGroup', {
        groupId: res.data.group.id,
        groupName: groupName
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setIsSubmitting(false);
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
        
        {/* Photo Upload */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoUploadBtn} onPress={handlePickImage} activeOpacity={0.8}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialIcons name="add-a-photo" size={36} color={colors.primary} />
                <Text style={styles.photoText}>Add Photo</Text>
              </View>
            )}
            {photoUri && (
              <View style={styles.editBadge}>
                <MaterialIcons name="edit" size={14} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Basic Info */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Wheat Harvest Crew"
            placeholderTextColor="#9CA3AF"
            value={groupName}
            onChangeText={setGroupName}
          />

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Group Type</Text>
          <View style={styles.typeContainer}>
            {GROUP_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.typePill, groupType === type.id && styles.typePillActive]}
                onPress={() => setGroupType(type.id)}
              >
                <MaterialIcons 
                  name={type.icon} 
                  size={18} 
                  color={groupType === type.id ? '#FFF' : '#6f8961'} 
                />
                <Text style={[styles.typeText, groupType === type.id && styles.typeTextActive]}>
                  {type.id}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Briefly describe your group's skills..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Member Count */}
        <View style={styles.counterCard}>
          <Text style={styles.counterLabel}>Expected Crew Size</Text>
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

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, isSubmitting && { opacity: 0.7 }]}
          onPress={handleContinue}
          activeOpacity={0.9}
          disabled={isSubmitting}
        >
          <Text style={styles.createButtonText}>
            {isSubmitting ? 'CREATING...' : 'CREATE GROUP'}
          </Text>
          {!isSubmitting && <MaterialIcons name="arrow-forward" size={24} color={colors.backgroundDark} />}
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
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoUploadBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  photoPlaceholder: {
    flex: 1,
    borderRadius: 50,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  photoText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.secondary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#131811',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6f8961',
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  counterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
