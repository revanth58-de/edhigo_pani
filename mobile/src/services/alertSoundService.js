import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import useAuthStore from '../store/authStore';

const LOCALE_MAP = {
  te: 'te-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

class AlertSoundService {
  async playJobOfferAlert(workType = 'పని / Work', pay = '') {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {}

    try {
      const language = useAuthStore.getState().user?.language || 'te';
      const text = language === 'te' 
        ? కొత్త పని ఆఫర్!  పని అందుబాటులో ఉంది.
        : language === 'hi'
        ? नया काम का ऑफर!  काम उपलब्ध है.
        : New Job Offer!  is available now.;

      Speech.stop();
      Speech.speak(text, {
        language: LOCALE_MAP[language] || 'en-IN',
        rate: 0.9,
        pitch: 1.0,
      });
    } catch (e) {
      console.warn('Speech alert error:', e.message);
    }
  }

  async playAttendanceSuccess(action = 'in') {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {}

    try {
      const language = useAuthStore.getState().user?.language || 'te';
      const text = action === 'in'
        ? (language === 'te' ? 'హాజరు నమోదయింది. పని ప్రారంభించండి!' : language === 'hi' ? 'उपस्थिति दर्ज की गई. काम शुरू करें!' : 'Attendance confirmed. Work started!')
        : (language === 'te' ? 'పని పూర్తయింది. ధన్యవాదాలు!' : language === 'hi' ? 'काम पूरा हुआ. धन्यवाद!' : 'Work completed. Thank you!');

      Speech.stop();
      Speech.speak(text, {
        language: LOCALE_MAP[language] || 'en-IN',
        rate: 0.9,
        pitch: 1.0,
      });
    } catch (e) {}
  }

  async playWorkerArrivedAlert(workerName = 'వర్కర్ / Worker') {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch (e) {}

    try {
      const language = useAuthStore.getState().user?.language || 'te';
      const text = language === 'te'
        ? ${workerName} మీ పొలానికి చేరుకున్నారు!
        : language === 'hi'
        ? ${workerName} आपके खेत पर पहुंच गए हैं!
        : ${workerName} has arrived at your farm!;

      Speech.stop();
      Speech.speak(text, {
        language: LOCALE_MAP[language] || 'en-IN',
        rate: 0.9,
        pitch: 1.0,
      });
    } catch (e) {}
  }

  async playWarningAlert(message) {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (e) {}

    if (message) {
      try {
        const language = useAuthStore.getState().user?.language || 'te';
        Speech.stop();
        Speech.speak(message, {
          language: LOCALE_MAP[language] || 'en-IN',
          rate: 0.9,
          pitch: 1.0,
        });
      } catch (e) {}
    }
  }

  async playNotificationAlert(title, body) {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e) {}

    const textToSpeak = body || title;
    if (textToSpeak) {
      try {
        const language = useAuthStore.getState().user?.language || 'te';
        Speech.stop();
        Speech.speak(textToSpeak, {
          language: LOCALE_MAP[language] || 'en-IN',
          rate: 0.9,
          pitch: 1.0,
        });
      } catch (e) {}
    }
  }

  stop() {
    try {
      Speech.stop();
    } catch (e) {}
  }
}

export const alertSoundService = new AlertSoundService();
export default alertSoundService;
