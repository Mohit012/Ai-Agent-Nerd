export let selectedVoice = null;
export let availableVoices = [];

export const loadVoices = () => {
  if ('speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    availableVoices = voices;
    if (voices.length > 0 && !selectedVoice) {
      const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
      selectedVoice = englishVoice || voices[0];
    }
  }
};

export const setVoice = (voice) => {
  selectedVoice = voice;
};

export const speak = (text, voice = null) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.voice = voice || selectedVoice;
    window.speechSynthesis.speak(utterance);
  }
};

export const stopSpeaking = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

if (typeof window !== 'undefined') {
  window.speechSynthesis?.onvoiceschanged !== undefined && window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
  loadVoices();
}

export const getLanguageName = (langCode) => {
  const langMap = {
    'en': 'English', 'en-US': 'English (US)', 'en-GB': 'English (UK)',
    'es': 'Spanish', 'es-ES': 'Spanish', 'fr': 'French', 'fr-FR': 'French',
    'de': 'German', 'de-DE': 'German', 'it': 'Italian', 'it-IT': 'Italian',
    'pt': 'Portuguese', 'pt-BR': 'Portuguese (Brazil)', 'zh': 'Chinese',
    'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
    'ja': 'Japanese', 'ko': 'Korean', 'hi': 'Hindi', 'ar': 'Arabic',
    'ru': 'Russian', 'nl': 'Dutch', 'pl': 'Polish', 'tr': 'Turkish',
    'vi': 'Vietnamese', 'th': 'Thai', 'id': 'Indonesian', 'ms': 'Malay',
    'sv': 'Swedish', 'da': 'Danish', 'fi': 'Finnish', 'no': 'Norwegian',
    'el': 'Greek', 'he': 'Hebrew', 'hu': 'Hungarian', 'cs': 'Czech',
    'ro': 'Romanian', 'uk': 'Ukrainian'
  };
  return langMap[langCode] || langCode;
};

export const getLanguageFlag = (langCode) => {
  const flagMap = {
    'en': '🇺🇸', 'en-US': '🇺🇸', 'en-GB': '🇬🇧',
    'es': '🇪🇸', 'es-ES': '🇪🇸', 'fr': '🇫🇷', 'fr-FR': '🇫🇷',
    'de': '🇩🇪', 'de-DE': '🇩🇪', 'it': '🇮🇹', 'it-IT': '🇮🇹',
    'pt': '🇧🇷', 'pt-BR': '🇧🇷', 'zh': '🇨🇳',
    'zh-CN': '🇨🇳', 'zh-TW': '🇹🇼',
    'ja': '🇯🇵', 'ko': '🇰🇷', 'hi': '🇮🇳', 'ar': '🇸🇦',
    'ru': '🇷🇺', 'nl': '🇳🇱', 'pl': '🇵🇱', 'tr': '🇹🇷',
    'vi': '🇻🇳', 'th': '🇹🇭', 'id': '🇮🇩', 'ms': '🇲🇾',
    'sv': '🇸🇪', 'da': '🇩🇰', 'fi': '🇫🇮', 'no': '🇳🇴',
    'el': '🇬🇷', 'he': '🇮🇱', 'hu': '🇭🇺', 'cs': '🇨🇿',
    'ro': '🇷🇴', 'uk': '🇺🇦'
  };
  return flagMap[langCode] || '🌐';
};

export const groupVoicesByLanguage = (voices) => {
  const grouped = {};
  voices.forEach(voice => {
    const lang = voice.lang;
    if (!grouped[lang]) {
      grouped[lang] = [];
    }
    grouped[lang].push(voice);
  });
  return Object.entries(grouped).map(([lang, voices]) => ({ lang, voices }));
};
