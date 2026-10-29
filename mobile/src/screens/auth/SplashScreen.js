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

const { width } = Dimensions.get('window');

// ── Assets ────────────────────────────────────────────────────────────────────
// DINASARI high-res emblem & wordmark logo
const LOGO = require('../../../assets/image.png');

const SplashScreen = ({ navigation, onFinish }) => {
  // Layer 1: Emblem animation (Rise & Scale)
  const emblemOpacity = useRef(new Animated.Value(0)).current;
  const emblemTranslateY = useRef(new Animated.Value(28)).current;
  const emblemScale = useRef(new Animated.Value(0.84)).current;
  const emblemTranslateX = useRef(new Animated.Value(0)).current;

  // Layer 2: DINASARI Title animation (Reveal)
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(18)).current;
  const titleScale = useRef(new Animated.Value(0.94)).current;
  const titleTranslateX = useRef(new Animated.Value(0)).current;

  // Layer 3: Single-line Tagline animation (Slide Up, no dots/particles)
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(10)).current;

  // Screen background exit fade
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Emblem layer rises and scales smoothly (starts at 0.1s, duration 0.9s)
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(emblemOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(emblemTranslateY, {
          toValue: 0,
          duration: 900,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(emblemScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 2. DINASARI title reveals smoothly (starts at 0.35s, duration 0.8s)
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(titleScale, {
          toValue: 1,
          duration: 800,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 3. Tagline slides up smoothly directly underneath DINASARI (starts at 0.65s, duration 0.75s)
    Animated.sequence([
      Animated.delay(650),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 750,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 750,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 4. Exit transition at ~2.4s
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        // Emblem slides right
        Animated.timing(emblemTranslateX, {
          toValue: width * 1.2,
          duration: 550,
          easing: Easing.bezier(0.4, 0, 1, 1),
          useNativeDriver: true,
        }),
        Animated.timing(emblemOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        // Title & tagline slide left and fade
        Animated.timing(titleTranslateX, {
          toValue: -30,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2400);

    // 5. Navigate to main app flow at ~2.8s
    const finishTimer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      } else if (navigation?.replace) {
        navigation.replace('LanguageSelection');
      }
    }, 2850);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [navigation, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f5f0" translucent />

      <View style={styles.splashCard}>
        {/* Emblem Layer: Top Sun, Leaves, and Gear */}
        <Animated.View
          style={[
            styles.emblemWrapper,
            {
              opacity: emblemOpacity,
              transform: [
                { translateY: emblemTranslateY },
                { scale: emblemScale },
                { translateX: emblemTranslateX },
              ],
            },
          ]}
        >
          <Image
            source={LOGO}
            style={styles.emblemImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Wordmark Layer: DINASARI text */}
        <Animated.View
          style={[
            styles.titleWrapper,
            {
              opacity: titleOpacity,
              transform: [
                { translateY: titleTranslateY },
                { scale: titleScale },
                { translateX: titleTranslateX },
              ],
            },
          ]}
        >
          <Image
            source={LOGO}
            style={styles.titleImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Single-line Tagline: Connect Collaborate Cultivate (no dots, no particles) */}
        <Animated.View
          style={[
            styles.taglineWrapper,
            {
              opacity: taglineOpacity,
              transform: [
                { translateY: taglineTranslateY },
                { translateX: titleTranslateX },
              ],
            },
          ]}
        >
          <Text style={styles.taglineText}>
            Connect Collaborate Cultivate
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f5f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
  },
  // Container clipping top 70% of image.png for Emblem
  emblemWrapper: {
    width: 280,
    height: 195,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  emblemImage: {
    width: 280,
    height: 280,
    top: 0,
  },
  // Container clipping bottom 30% of image.png for DINASARI text
  titleWrapper: {
    width: 280,
    height: 75,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -10,
  },
  titleImage: {
    width: 280,
    height: 280,
    top: -195,
  },
  // Tagline directly underneath DINASARI (centered, single line, no dots)
  taglineWrapper: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2f5d34',
    letterSpacing: 0.9,
    textAlign: 'center',
  },
});

export default SplashScreen;
