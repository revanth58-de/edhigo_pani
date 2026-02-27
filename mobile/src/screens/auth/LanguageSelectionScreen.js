// Screen 2: Language Selection - Exact match to language-selection.html
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';

const LanguageSelectionScreen = ({ navigation }) => {
  const setLanguage = useAuthStore((state) => state.setLanguage);
  const language = useAuthStore((state) => state.language) || 'en';
  const { t } = useTranslation();

  useEffect(() => {
  }, []);

  const handleLanguageSelect = async (lang, text) => {
    setLanguage(lang);
    // Small delay for voice feedback
    setTimeout(() => {
      navigation.replace('Register');
    }, 500);
  };


  const languages = [
    {
      code: 'te',
      native: 'తెలుగు',
      english: 'Telugu',
      icon: '🇮🇳',
      speech: 'Telugu selected',
    },
    {
      code: 'hi',
      native: 'हिन्दी',
      english: 'Hindi',
      icon: '🇮🇳',
      speech: 'Hindi selected',
    },
    {
      code: 'en',
      native: 'English',
      english: 'Global',
      icon: '🌍',
      speech: 'English selected',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

      <View style={{ height: 40 }} />

      {/* Headline */}
      <View style={styles.headlineContainer}>
        <Text style={styles.mainHeadline}>Choose your language</Text>
        <Text style={styles.subHeadline}>अपनी भाषा चुनें / మీ భాషను ఎంచుకోండి</Text>
      </View>

      {/* Language Buttons */}
      <View style={styles.buttonsContainer}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={styles.languageButton}
            activeOpacity={0.9}
            onPress={() => handleLanguageSelect(lang.code, lang.speech)}
          >
            {/* Icon Circle */}
            <View style={styles.iconCircle}>
              <Text style={styles.flagIcon}>{lang.icon}</Text>
            </View>

            {/* Text */}
            <View style={styles.textContainer}>
              <Text style={styles.nativeText}>{lang.native}</Text>
              <Text style={styles.englishText}>{lang.english}</Text>
            </View>

            {/* Chevron */}
            <MaterialIcons name="chevron-right" size={40} color={colors.primary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Helper Box */}
      <View style={styles.helperContainer}>
        <View style={styles.helperBox}>
          <MaterialIcons name="touch-app" size={40} color={colors.primary} />
          <Text style={styles.helperText}>Touch any button to select</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  contentContainer: {
    padding: 16,
    minHeight: '100%',
  },
  // Headline
  headlineContainer: {
    paddingBottom: 32,
    marginTop: 24,
  },
  mainHeadline: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#131811',
    textAlign: 'center',
    marginBottom: 8,
  },
  subHeadline: {
    fontSize: 18,
    color: '#13181199', // 60% opacity
    textAlign: 'center',
  },
  // Language Buttons
  buttonsContainer: {
    gap: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    borderBottomWidth: 8,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    gap: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}33`, // 20% opacity
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagIcon: {
    fontSize: 40,
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  nativeText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#131811',
  },
  englishText: {
    fontSize: 20,
    color: '#13181199', // 60% opacity
  },
  // Helper Box
  helperContainer: {
    marginTop: 'auto',
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  helperBox: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 24,
    backgroundColor: `${colors.primary}1A`, // 10% opacity
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: `${colors.primary}4D`, // 30% opacity
    gap: 8,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  helperText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#131811',
    textAlign: 'center',
  },
});

export default LanguageSelectionScreen;
