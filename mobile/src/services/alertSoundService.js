import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import useAuthStore from '../store/authStore';

let ExpoAudio = null;
try {
  ExpoAudio = require('expo-av').Audio;
} catch (e) {
  // Graceful fallback if expo-av native module is unavailable
}

// Audio assets tailored for Edhigo Pani agricultural platform
const SOUND_JOB_POSTED = require('../assets/sounds/job_posted.wav');
const SOUND_JOB_ACCEPTED = require('../assets/sounds/job_accepted.wav');

const LOCALE_MAP = {
  te: 'te-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

class AlertSoundService {
  /**
   * Helper to play a custom sound file with expo-av and web fallback
   */
  async _playSound(assetSource) {
    try {
      if (ExpoAudio) {
        await ExpoAudio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });

        const { sound } = await ExpoAudio.Sound.createAsync(
          assetSource,
          { shouldPlay: true, volume: 1.0 }
        );

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
          }
        });
        return;
      }
    } catch (err) {
      console.warn('ExpoAudio playback notice:', err.message);
    }

    // Web fallback if browser environment
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
        const audioUrl = typeof assetSource === 'string' ? assetSource : (assetSource?.uri || assetSource);
        if (audioUrl) {
          const webAudio = new window.Audio(audioUrl);
          webAudio.play().catch(() => {});
        }
      }
    } catch (e) {
      // Ignored: browser autoplay policy
    }
  }

  /**
   * 🌾 Job Posted / New Job Offer Notification Sound
   * Plays custom resonant farm bell chime + voice announcement in selected language
   */
  async playJobOfferAlert(workType = 'పని / Work', pay = '') {
    // 1. Play custom audio chime
    await this._playSound(SOUND_JOB_POSTED);

    // 2. Trigger tactile feedback
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {}

    // 3. Clear voice announcement in user's language (Telugu / Hindi / English)
    try {
      const language = useAuthStore.getState().user?.language || 'te';
      const text = language === 'te' 
        ? `కొత్త పని పోస్ట్ అయింది! ${workType} పని అందుబాటులో ఉంది.`
        : language === 'hi'
        ? `नया काम पोस्ट हुआ! ${workType} काम उपलब्ध है.`
        : `New Job Posted! ${workType} is available now.`;

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

  // Alias for semantic clarity
  async playJobPostedAlert(workType = 'పని / Work', pay = '') {
    return this.playJobOfferAlert(workType, pay);
  }

  /**
   * 🎉 Job Accepted Notification Sound
   * Plays celebratory ascending harvest chime + voice announcement
   */
  async playJobAcceptedAlert({ workerName = 'వర్కర్ / Worker', workType = '', isGroup = false, groupName = '' } = {}) {
    // 1. Play custom celebratory ascending arpeggio sound
    await this._playSound(SOUND_JOB_ACCEPTED);

    // 2. Trigger heavy impact feedback
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch (e) {}

    // 3. Spoken announcement tailored for farmers / leaders
    try {
      const language = useAuthStore.getState().user?.language || 'te';
      const displayName = isGroup ? (groupName || 'బృందం / Group') : workerName;
      
      const text = language === 'te'
        ? (isGroup ? `శుభవార్త! ${displayName} బృందం మీ పనిని అంగీకరించారు!` : `శుభవార్త! ${displayName} మీ పనిని అంగీకరించారు!`)
        : language === 'hi'
        ? (isGroup ? `शुभ समाचार! ${displayName} ग्रुप ने आपका काम स्वीकार कर लिया!` : `शुभ समाचार! ${displayName} ने आपका काम स्वीकार कर लिया!`)
        : (isGroup ? `Great news! ${displayName} group has accepted your job!` : `Great news! ${displayName} accepted your job!`);

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
        ? `${workerName} మీ పొలానికి చేరుకున్నారు!`
        : language === 'hi'
        ? `${workerName} आपके खेत पर पहुंच गए हैं!`
        : `${workerName} has arrived at your farm!`;

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
