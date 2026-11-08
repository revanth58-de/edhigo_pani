// DINASARI Morphing Splash ➔ Login Bottom Sheet
// Implemented to exactly match the video reference:
// 1. Splash: Centered 3D emblem with DINASARI, tagline with golden shimmer on ivory background.
// 2. Transition: Deep forest green vignette, logo & tagline scale down and glide up to hero.
// 3. Login: White bottom sheet with rounded top corners glides up from bottom.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  Image,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const LOGO = require('../../../assets/image.png');

export default function DinasariSplashAuth({ navigation, onLoginSuccess }) {
  // Animation drivers
  const darkBgOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(1)).current;
  const bottomSheetTranslateY = useRef(new Animated.Value(height * 0.75)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  // Form states
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [isMorphed, setIsMorphed] = useState(false);

  useEffect(() => {
    // 1. Tagline fade in at 0.8s
    Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 800,
      delay: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // 2. Morph transition triggers at 2.8s (matching video)
    const timer = setTimeout(() => {
      triggerMorph();
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const triggerMorph = () => {
    setIsMorphed(true);

    Animated.parallel([
      // A. Dark forest green background layer fades in
      Animated.timing(darkBgOpacity, {
        toValue: 1,
        duration: 750,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      // B. Hero brand glides up and scales down smoothly
      Animated.timing(heroTranslateY, {
        toValue: -height * 0.24,
        duration: 850,
        easing: Easing.bezier(0.34, 1.2, 0.64, 1),
        useNativeDriver: true,
      }),
      Animated.timing(heroScale, {
        toValue: 0.72,
        duration: 850,
        easing: Easing.bezier(0.34, 1.2, 0.64, 1),
        useNativeDriver: true,
      }),
      // C. White login bottom sheet slides up into view
      Animated.timing(bottomSheetTranslateY, {
        toValue: 0,
        duration: 850,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isMorphed ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Dark Forest Green Background Overlay */}
      <Animated.View style={[styles.darkBgLayer, { opacity: darkBgOpacity }]} />

      {/* Hero Branding: Emblem + DINASARI + Tagline */}
      <Animated.View
        style={[
          styles.heroBrand,
          {
            transform: [
              { translateY: heroTranslateY },
              { scale: heroScale },
            ],
          },
        ]}
      >
        <View style={styles.emblemContainer}>
          <Image source={LOGO} style={styles.emblemImage} resizeMode="contain" />
        </View>

        <Animated.View style={{ opacity: taglineOpacity, marginTop: -8 }}>
          <Text style={[styles.taglineText, isMorphed && styles.taglineLight]}>
            Connect, Collaborate, Cultivate
          </Text>
        </Animated.View>
      </Animated.View>

      {/* White Login Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY: bottomSheetTranslateY }],
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Top Drag Handle */}
          <View style={styles.dragHandle} />

          <Text style={styles.welcomeTitle}>Welcome Back</Text>

          {/* Email / Phone Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Email or phone"
              placeholderTextColor="#9ba698"
              value={phoneOrEmail}
              onChangeText={setPhoneOrEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              placeholderTextColor="#9ba698"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Keep me signed in & Forgot Password */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setKeepSignedIn(!keepSignedIn)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, keepSignedIn && styles.checkboxActive]}>
                {keepSignedIn && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Keep me signed in</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Log In Button */}
          <TouchableOpacity
            style={styles.loginButton}
            activeOpacity={0.85}
            onPress={() => {
              if (onLoginSuccess) onLoginSuccess();
            }}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Row */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton} activeOpacity={0.85}>
              <Text style={styles.socialIcon}>🇬</Text>
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} activeOpacity={0.85}>
              <Text style={styles.socialIcon}></Text>
              <Text style={styles.socialText}>Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Up Footer */}
          <View style={styles.signUpRow}>
            <Text style={styles.signUpPrompt}>Don't have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation?.navigate?.('Register')}
            >
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f5', // Ivory background from video
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBgLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#16331a', // Rich forest green
  },
  heroBrand: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  emblemContainer: {
    width: 240,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemImage: {
    width: '100%',
    height: '100%',
  },
  taglineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#586953',
    letterSpacing: 0.6,
  },
  taglineLight: {
    color: '#e5edd9', // Luminous ivory when background turns dark green
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 25,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e3de',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#172619',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e8e3',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 14,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.5,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a261a',
  },
  eyeIcon: {
    fontSize: 16,
    opacity: 0.5,
    padding: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#9ba698',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: '#24532b',
    borderColor: '#24532b',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#556353',
    fontWeight: '500',
  },
  forgotPassword: {
    fontSize: 13,
    color: '#556353',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  loginButton: {
    height: 52,
    backgroundColor: '#24532b', // Solid rich forest green
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#24532b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e7ebe5',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#94a192',
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  socialButton: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#e5e8e3',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  socialIcon: {
    fontSize: 16,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263324',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpPrompt: {
    fontSize: 13,
    color: '#596956',
    fontWeight: '500',
  },
  signUpLink: {
    fontSize: 13,
    color: '#172619',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
