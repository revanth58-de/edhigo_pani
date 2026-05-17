import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * OfflineBanner
 * Shows a persistent red banner at the top of the screen whenever the
 * device loses internet connectivity. Animates in/out smoothly.
 *
 * Usage: Place once inside your root navigator in App.js:
 *   <OfflineBanner />
 *   <NavigationContainer> ... </NavigationContainer>
 */
const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
      if (offline) setWasOffline(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOffline) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    } else if (wasOffline) {
      // Briefly show "Back online", then slide up
      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setWasOffline(false));
      }, 2000);
    }
  }, [isOffline]);

  if (!isOffline && !wasOffline) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        isOffline ? styles.offlineBanner : styles.onlineBanner,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <MaterialIcons
        name={isOffline ? 'wifi-off' : 'wifi'}
        size={18}
        color="#fff"
        style={styles.icon}
      />
      <Text style={styles.text}>
        {isOffline ? 'No internet connection' : 'Back online'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  offlineBanner: {
    backgroundColor: '#dc2626', // red-600
  },
  onlineBanner: {
    backgroundColor: '#16a34a', // green-600
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OfflineBanner;
