// Screen 1: Splash Screen — DINASARI branding
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

// ── Assets ────────────────────────────────────────────────────────────────────
// App icon-style logo (no text) — used as the animated centerpiece
let LOGO;
try {
  LOGO = require('../../../assets/logo.png');
} catch (_) {
  LOGO = require('../../../assets/icon.png');
}

const SplashScreen = ({ navigation }) => {
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(0.75)).current;
  const spinAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(30)).current;
  const dotAnim1   = useRef(new Animated.Value(0.3)).current;
  const dotAnim2   = useRef(new Animated.Value(0.3)).current;
  const dotAnim3   = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // ── Logo entrance ──
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // ── Spinning ring loader ──
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // ── Pulsing dots (staggered) ──
    const pulseDot = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();

    pulseDot(dotAnim1, 0);
    pulseDot(dotAnim2, 200);
    pulseDot(dotAnim3, 400);

    // ── Navigate to LanguageSelection after 2.4 s ──
    const timer = setTimeout(() => {
      navigation.replace('LanguageSelection');
    }, 2400);

    return () => clearTimeout(timer);
  }, [navigation]);

  const spin = spinAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#f0f7f4', '#e8f5e9', '#ffffff']}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Decorative top arc ── */}
      <View style={styles.topArc} />

      {/* ── Logo section ── */}
      <Animated.View
        style={[
          styles.logoSection,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          },
        ]}
      >
        {/* Ambient glow behind logo */}
        <View style={styles.glowOuter} />
        <View style={styles.glowInner} />

        {/* Logo image */}
        <View style={styles.logoWrapper}>
          <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
        </View>

        {/* App name */}
        <Text style={styles.appName}>DINASARI</Text>
        <View style={styles.taglineRow}>
          <View style={styles.taglineLine} />
          <Text style={styles.tagline}>Farmer · Worker Connect</Text>
          <View style={styles.taglineLine} />
        </View>
      </Animated.View>

      {/* ── Spinner + dots loader ── */}
      <View style={styles.loaderSection}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dotAnim1 }]} />
          <Animated.View style={[styles.dot, { opacity: dotAnim2 }]} />
          <Animated.View style={[styles.dot, { opacity: dotAnim3 }]} />
        </View>
      </View>

      {/* ── Bottom branding strip ── */}
      <View style={styles.bottomStrip}>
        <LinearGradient
          colors={[colors.primaryDark, colors.primary, '#40916c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomGradient}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // ── Decorative arcs ──
  topArc: {
    position: 'absolute',
    top: -width * 0.4,
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: width * 0.7,
    backgroundColor: `${colors.primary}08`,
  },

  // ── Logo section ──
  logoSection: {
    alignItems: 'center',
    marginBottom: 60,
  },

  glowOuter: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: `${colors.primary}0D`,
    top: -30,
  },
  glowInner: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: `${colors.primary}12`,
    top: 5,
  },

  logoWrapper: {
    width: 180,
    height: 180,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 160,
    height: 160,
  },

  appName: {
    marginTop: 24,
    fontSize: 36,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 6,
    textTransform: 'uppercase',
  },

  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  taglineLine: {
    width: 28,
    height: 1,
    backgroundColor: `${colors.primary}60`,
  },
  tagline: {
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },

  // ── Loader ──
  loaderSection: {
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: `${colors.primary}25`,
    borderTopColor: colors.primary,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // ── Bottom strip ──
  bottomStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  bottomGradient: {
    flex: 1,
  },
});

export default SplashScreen;
