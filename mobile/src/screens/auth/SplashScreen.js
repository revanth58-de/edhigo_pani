// Screen 1: Splash Screen - Exact match to splash-screen.html
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { getSpeechLang, safeSpeech } from '../../utils/voiceGuidance';
import { colors } from '../../theme/colors';

const SplashScreen = ({ navigation }) => {
  const language = useAuthStore((state) => state.language) || 'en';
  const { t } = useTranslation();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Voice guidance
    safeSpeech(t('voice.chooseLanguage'), { language: getSpeechLang(language) });

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();

    // Spinning loader
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Auto-navigate after 2 seconds
    const timer = setTimeout(() => {
      navigation.replace('LanguageSelection');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

      {/* Top Spacer */}
      <View style={styles.topSpacer} />

      {/* Logo Section */}
      <Animated.View
        style={[
          styles.logoSection,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Outer Glow */}
        <View style={styles.logoGlow} />

        {/* Main Logo Circle */}
        <View style={styles.logoCircle}>
          <MaterialIcons name="eco" size={72} color={colors.primary} />
          <MaterialIcons
            name="handshake"
            size={60}
            color="#4a3728"
            style={styles.handshakeIcon}
          />
        </View>

        {/* Loading Spinner */}
        <View style={styles.loaderContainer}>
          <Animated.View
            style={[styles.spinner, { transform: [{ rotate: spin }] }]}
          />
          <Text style={styles.loadingText}>LOADING</Text>
        </View>
      </Animated.View>

      {/* Bottom Voice Guidance Section */}
      <View style={styles.bottomSection}>
        {/* Waveform Bars */}
        <View style={styles.waveformContainer}>
          <View style={[styles.waveBar, { height: 16 }]} />
          <View style={[styles.waveBar, { height: 32 }]} />
          <View style={[styles.waveBar, { height: 24 }]} />
          <View style={[styles.waveBar, { height: 40 }]} />
          <View style={[styles.waveBar, { height: 20 }]} />
        </View>

        {/* Voice Button */}
        <View style={styles.voiceButton}>
          <MaterialIcons name="volume-up" size={28} color={colors.backgroundDark} />
          <Text style={styles.voiceText}>App start avutondi</Text>
        </View>

        {/* Branding */}
        <Text style={styles.brandText}>Farmer-Worker Connect</Text>
      </View>

      {/* Bottom Gradient Line */}
      <View style={styles.bottomGradient} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    paddingVertical: 48,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topSpacer: {
    height: 40,
  },
  logoSection: {
    alignItems: 'center',
    gap: 32,
  },
  logoGlow: {
    position: 'absolute',
    top: -16,
    left: -16,
    right: -16,
    bottom: -16,
    backgroundColor: `${colors.primary}33`, // 20% opacity
    borderRadius: 9999,
    opacity: 0.3,
  },
  logoCircle: {
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  handshakeIcon: {
    marginTop: -16,
  },
  loaderContainer: {
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: `${colors.primary}33`,
    borderTopColor: colors.primary,
  },
  loadingText: {
    color: '#4a372866', // earth-brown with 40% opacity
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bottomSection: {
    width: '100%',
    maxWidth: 384,
    alignItems: 'center',
    gap: 24,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
  },
  waveBar: {
    width: 4,
    backgroundColor: colors.primary,
    borderRadius: 9999,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 9999,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 84,
    maxWidth: 480,
    height: 56,
  },
  voiceText: {
    color: colors.backgroundDark,
    fontSize: 18,
    fontWeight: 'bold',
  },
  brandText: {
    color: '#13181180', // 50% opacity
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: `${colors.primary}4D`, // 30% opacity
  },
});

export default SplashScreen;
