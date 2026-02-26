// Shared Top App Bar with Help icon in top-right
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';

const TopBar = ({ title = 'Home', showBack = false, navigation, onHelp }) => {
  const { t } = useTranslation();

  const handleHelp = () => {
    if (onHelp) {
      onHelp();
    } else {
      const phoneNumber = '+911800123456';
      Linking.canOpenURL(`tel:${phoneNumber}`).then((supported) => {
        if (supported) {
          Linking.openURL(`tel:${phoneNumber}`);
        } else {
          Alert.alert(
            'Help / సహాయం',
            'Support: +91 1800-123-456',
            [{ text: 'OK' }]
          );
        }
      });
    }
  };

  return (
    <View style={styles.topBar}>
      {showBack && navigation ? (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#131811" />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButtonPlaceholder} />
      )}

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      <TouchableOpacity style={styles.helpButton} onPress={handleHelp}>
        <MaterialIcons name="help-outline" size={26} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 40, // Increased top padding for mobile status bar visibility
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 100,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}1A`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonPlaceholder: {
    width: 44,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#131811',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  helpButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}0D`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: `${colors.primary}33`,
  },
});

export default TopBar;
