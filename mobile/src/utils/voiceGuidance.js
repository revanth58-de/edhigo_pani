// Voice Guidance Utility — uses expo-speech for text-to-speech
// Provides per-screen voice messages in Telugu, Hindi, and English
// The selected language from authStore determines which language to speak

import * as Speech from 'expo-speech';

// Voice messages for each screen, keyed by screen name
const VOICE_MESSAGES = {
  Language: {
    te: 'మీ భాషను ఎంచుకోండి. మీరు తెలుగు, హిందీ లేదా ఇంగ్లీష్ ఎంచుకోవచ్చు',
    hi: 'अपनी भाषा चुनें। आप तेलुगु, हिंदी या अंग्रेज़ी चुन सकते हैं',
    en: 'Choose your language. You can select Telugu, Hindi, or English',
  },
  Login: {
    te: 'మీ మొబైల్ నంబర్ ఎంటర్ చేయండి',
    hi: 'अपना मोबाइल नंबर दर्ज करें',
    en: 'Enter your mobile number using the keypad below',
  },
  OTP: {
    te: 'OTP ఎంటర్ చేయండి. మీ ఫోనుకు పంపిన 4 అంకెల కోడ్ ఎంటర్ చేయండి',
    hi: 'OTP दर्ज करें। अपने फ़ोन पर भेजा गया 4 अंकों का कोड दर्ज करें',
    en: 'Enter the 4-digit OTP code sent to your phone',
  },
  RoleSelection: {
    te: 'మీరు ఎవరు? రైతు, కూలీ లేదా గ్రూప్ లీడర్ ఎంచుకోండి',
    hi: 'आप कौन हैं? किसान, मजदूर या ग्रुप लीडर चुनें',
    en: 'Who are you? Select Farmer, Worker, or Group Leader',
  },
  FarmerHome: {
    te: 'మీకు ఏ పని కావాలి? పని రకాన్ని ఎంచుకోండి',
    hi: 'आपको क्या काम चाहिए? काम का प्रकार चुनें',
    en: 'What work do you need? Select the type of work',
  },
  FarmerProfile: {
    te: 'మీ ప్రొఫైల్ అప్డేట్ చేయండి',
    hi: 'अपनी प्रोफ़ाइल अपडेट करें',
    en: 'Update your profile information',
  },
  SelectWorkers: {
    te: 'మీకు ఎంతమంది కూలీలు కావాలి? సంఖ్య ఎంచుకోండి',
    hi: 'आपको कितने मजदूर चाहिए? संख्या चुनें',
    en: 'How many workers do you need? Select the count',
  },
  RequestSent: {
    te: 'మీ అభ్యర్థన పంపబడింది. కూలీల కోసం వెతుకుతున్నాం',
    hi: 'आपकी रिक्वेस्ट भेजी गई। मजदूर ढूंढ रहे हैं',
    en: 'Your request has been sent. Searching for workers nearby',
  },
  RequestAccepted: {
    te: 'కూలీ మీ అభ్యర్థన స్వీకరించారు. వారు మీ వైపు వస్తున్నారు',
    hi: 'मजदूर ने आपकी रिक्वेस्ट स्वीकार की। वे आपकी ओर आ रहे हैं',
    en: 'A worker has accepted your request. They are on their way to you',
  },
  ArrivalAlert: {
    te: 'వర్కర్ వచ్చారు. స్కాన్ చేయండి',
    hi: 'वर्कर आ गया। स्कैन करें',
    en: 'Worker has arrived. Please scan their attendance',
  },
};

// Get the correct language code for expo-speech
export const getSpeechLang = (langCode) => {
  switch (langCode) {
    case 'te':
      return 'te-IN';
    case 'hi':
      return 'hi-IN';
    case 'en':
    default:
      return 'en-IN';
  }
};

/**
 * Safe Speech — stops any ongoing speech before starting new speech.
 * Use this instead of Speech.speak() directly to prevent queued/repeating voices.
 * @param {string} text — text to speak
 * @param {object} options — expo-speech options (language, pitch, rate, etc.)
 */
export const safeSpeech = (text, options = {}) => {
  Speech.stop();
  Speech.speak(text, options);
};

/**
 * Speak a voice guidance message for the given screen.
 * @param {string} screenName — key in VOICE_MESSAGES (e.g. 'Login', 'OTP')
 * @param {string} language — user's selected language ('te', 'hi', 'en')
 */
export const speak = async (screenName, language = 'en') => {
  // Stop any ongoing speech first
  Speech.stop();

  const messages = VOICE_MESSAGES[screenName];
  if (!messages) return;

  const text = messages[language] || messages.en;
  let speechLang = getSpeechLang(language);

  console.log(`[Voice] Requesting speak: "${text}" in ${speechLang}`);

  // Check available voices (useful for debugging web/android issues)
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    console.log(`[Voice] Available voices count: ${voices.length}`);
    
    // Check if the requested language is supported
    const isLangSupported = voices.some(v => v.language.includes(language));
    if (!isLangSupported && language !== 'en') {
      console.warn(`[Voice] Language ${language} not found in available voices. Fallback to English.`);
      // Optional: Fallback to English if preferred language is missing
      // speechLang = 'en-US'; 
    }
  } catch (e) {
    console.warn('[Voice] Failed to get available voices:', e);
  }

  Speech.speak(text, {
    language: speechLang,
    pitch: 1.0,
    rate: 0.9,
    onStart: () => console.log('[Voice] Started'),
    onDone: () => console.log('[Voice] Finished'),
    onError: (e) => console.error('[Voice] Error:', e),
  });
};

/**
 * Speak custom text.
 * @param {string} text — text to speak
 * @param {string} language — 'te', 'hi', or 'en'
 */
export const speakCustom = (text, language = 'en') => {
  Speech.stop();
  Speech.speak(text, {
    language: getSpeechLang(language),
    pitch: 1.0,
    rate: 0.85,
  });
};

/**
 * Stop any ongoing speech.
 */
export const stopSpeaking = () => {
  Speech.stop();
};

export default { speak, speakCustom, stopSpeaking, VOICE_MESSAGES };
