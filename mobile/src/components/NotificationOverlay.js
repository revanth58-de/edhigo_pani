import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { colors } from '../theme/colors';
import useAuthStore from '../store/authStore';

const NotificationOverlay = () => {
  const user = useAuthStore(state => state.user);
  const [visible, setVisible] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const handleIncoming = (title, body, data) => {
      console.log('🔔 Custom UI Triggered for Notification:', title, body);
      setNotification({ title, body, data });
      setVisible(true);

      // Play Voice-over
      if (body) {
        Speech.speak(body, {
          language: user?.language === 'te' ? 'te-IN' : user?.language === 'hi' ? 'hi-IN' : 'en-IN',
          rate: 0.9,
          pitch: 1.0,
        });
      }
    };

    // 1. Fired whenever a notification is received while the app is open
    const sub1 = Notifications.addNotificationReceivedListener(noti => {
      const { title, body, data } = noti.request.content;
      handleIncoming(title, body, data);
    });

    // 2. Fired whenever a user taps on a notification (from locked or background state)
    const sub2 = Notifications.addNotificationResponseReceivedListener(response => {
      const { title, body, data } = response.notification.request.content;
      handleIncoming(title, body, data);
    });

    return () => {
      if (sub1) sub1.remove();
      if (sub2) sub2.remove();
    };
  }, [user?.language]);

  if (!visible || !notification) return null;

  const handleDismiss = () => {
    setVisible(false);
    setNotification(null);
    Speech.stop(); // Stop reading if they quickly dismiss
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🔔</Text>
          <Text style={styles.title}>{notification.title || 'New Notification'}</Text>
          <Text style={styles.body}>{notification.body}</Text>
          
          <TouchableOpacity style={styles.button} onPress={handleDismiss} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Got It / సరే</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default NotificationOverlay;
