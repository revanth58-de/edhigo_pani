import * as Speech from 'expo-speech';
import useAuthStore from '../store/authStore';

// Maps app language codes to BCP-47 locale tags for expo-speech
const LOCALE_MAP = {
  te: 'te-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

/**
 * useSpeech — a simple hook that wraps expo-speech.
 *
 * Usage:
 *   const { speak, stop } = useSpeech();
 *   speak('Hello!');       // speaks in the user's selected language
 *   stop();                // stops any ongoing speech
 */
export const useSpeech = () => {
  const language = useAuthStore((s) => s.language) || 'en';

  const speak = (text) => {
    if (!text) return;
    Speech.stop(); // stop any ongoing speech before starting new one
    Speech.speak(text, {
      language: LOCALE_MAP[language] || 'en-IN',
      rate: 0.9,   // slightly slower for clarity
      pitch: 1.0,
    });
  };

  const stop = () => {
    Speech.stop();
  };

  return { speak, stop };
};

export default useSpeech;
