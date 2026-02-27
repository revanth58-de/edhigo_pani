// Screen 2: Language Selection
// Based on: code10.html — "Choose your language" with Telugu, Hindi, English cards
// Backend: Saves language preference locally (sent to backend after login)
// Logic: Stores selected language in Zustand auth store → navigates to Login

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../theme/colors';
import useAuthStore from '../../store/authStore';

const LANGUAGES = [
  {
    code: 'te',
    native: 'తెలుగు',
    english: 'Telugu',
    emoji: '🇮🇳',
    description: 'Andhra Pradesh & Telangana',
  },
  {
    code: 'hi',
    native: 'हिन्दी',
    english: 'Hindi',
    emoji: '🇮🇳',
    description: 'National Language',
  },
  {
    code: 'en',
    native: 'English',
    english: 'Global',
    emoji: '🌍',
    description: 'International',
  },
];

const LanguageScreen = ({ navigation }) => {
  const setLanguage = useAuthStore((state) => state.setLanguage);
  const language = useAuthStore((state) => state.language) || 'en';

  const handleSelectLanguage = (langCode) => {
    // Save language in local state (will be synced to backend after login)
    setLanguage(langCode);
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>


        {/* Headline */}
        <View style={styles.headlineContainer}>
          <Text style={styles.headline}>Choose your language</Text>
          <Text style={styles.subheadline}>अपनी भाषा चुनें / మీ భాషను ఎంచుకోండి</Text>
        </View>

        {/* Language Buttons */}
        <View style={styles.languageList}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={styles.languageCard}
              activeOpacity={0.8}
              onPress={() => handleSelectLanguage(lang.code)}
            >
              {/* Icon Circle */}
              <View style={styles.langIconCircle}>
                <Text style={styles.langEmoji}>{lang.emoji}</Text>
              </View>

              {/* Text */}
              <View style={styles.langTextContainer}>
                <Text style={styles.langNative}>{lang.native}</Text>
                <Text style={styles.langEnglish}>{lang.english}</Text>
              </View>

              {/* Chevron */}
              <MaterialIcons
                name="chevron-right"
                size={40}
                color={colors.primary}
                style={styles.chevron}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Helper Hint */}
        <View style={styles.hintContainer}>
          <View style={styles.hintBox}>
            <MaterialIcons name="touch-app" size={40} color={colors.primary} />
            <Text style={styles.hintText}>Touch any button to select</Text>
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },


  // Headline
  headlineContainer: {
    paddingBottom: 32,
  },
  headline: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 18,
    color: 'rgba(19, 24, 17, 0.7)',
    textAlign: 'center',
    marginTop: 4,
  },

  // Language cards
  languageList: {
    gap: 20,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    // 3D button effect — border-bottom simulates depth
    borderBottomWidth: 8,
    borderBottomColor: '#e5e7eb',
    ...shadows.lg,
  },
  langIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langEmoji: {
    fontSize: 40,
  },
  langTextContainer: {
    flex: 1,
  },
  langNative: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  langEnglish: {
    fontSize: 20,
    color: 'rgba(19, 24, 17, 0.6)',
  },
  chevron: {
    paddingRight: 16,
  },

  // Hint
  hintContainer: {
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  hintBox: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: 'rgba(91, 236, 19, 0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(91, 236, 19, 0.3)',
  },
  hintText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});

export default LanguageScreen;
