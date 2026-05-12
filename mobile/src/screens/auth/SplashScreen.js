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
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Static fade-in only
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Auto-navigate after 2.5 seconds
    const timer = setTimeout(() => {
      navigation.replace('LanguageSelection');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Main Branding Section */}
      <Animated.View
        style={[
          styles.brandContainer,
          { opacity: fadeAnim },
        ]}
      >
        <Image 
          source={require('../../../assets/icon.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Text style={styles.appName}>Dinasari</Text>
        <Text style={styles.appTagline}>Dinasari</Text>
      </Animated.View>

      {/* Bottom Footer */}
      <View style={styles.footer}>
        <View style={styles.divider} />
        <Text style={styles.poweredBy}>Powered by</Text>
        <Text style={styles.companyName}>Dinasari</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 240,
    height: 240,
    marginBottom: 32,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  appTagline: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.secondary,
    letterSpacing: 1,
    opacity: 0.8,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
    marginBottom: 16,
  },
  poweredBy: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  companyName: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '700',
    marginTop: 4,
  },
});

export default SplashScreen;
