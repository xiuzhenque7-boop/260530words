import { Word, WordList, WrongWord } from "../types";

// Clean static default mock lists to provide a polished first-use experience
const DEFAULT_WORD_LISTS: WordList[] = [
  {
    id: "default-1",
    name: "基础日常词汇 (Daily Essential)",
    createdAt: new Date().toISOString(),
    words: [
      {
        id: "d-w1",
        word: "challenge",
        translation: "挑战，提出质疑",
        phonetic: "/ˈtʃælɪndʒ/",
        sentence: "Learning a new language is a great challenge.",
        sentenceTranslation: "学习一门新语言是一个巨大的挑战。",
        createdAt: new Date().toISOString(),
      },
      {
        id: "d-w2",
        word: "opportunity",
        translation: "机会，时机",
        phonetic: "/ˌɒpəˈtjuːnɪti/",
        sentence: "Every failure is an opportunity to grow stronger.",
        sentenceTranslation: "每一次失败都是一次让自己变得更强大的机会。",
        createdAt: new Date().toISOString(),
      },
      {
        id: "d-w3",
        word: "achievement",
        translation: "成就，成绩，达到",
        phonetic: "/əˈtʃiːvmənt/",
        sentence: "Completing this dictation counts as a great achievement.",
        sentenceTranslation: "完成这次默写算是一项了不起的成就。",
        createdAt: new Date().toISOString(),
      },
      {
        id: "d-w4",
        word: "consequence",
        translation: "后果，影响",
        phonetic: "/ˈkɒnsɪkwəns/",
        sentence: "You must consider the consequence of your choices.",
        sentenceTranslation: "你必须考虑你选择的后果。",
        createdAt: new Date().toISOString(),
      },
      {
        id: "d-w5",
        word: "independent",
        translation: "独立的，自主的",
        phonetic: "/ˌɪndɪˈpendənt/",
        sentence: "She is an independent thinker with creative ideas.",
        sentenceTranslation: "她是一个有着创造性想法的独立思考者。",
        createdAt: new Date().toISOString(),
      },
    ],
  },
];

// Local Storage Keys
const KEYS = {
  WORD_LISTS: "voxwrite_word_lists",
  WRONG_WORDS: "voxwrite_wrong_words",
};

export function getWordLists(): WordList[] {
  const data = localStorage.getItem(KEYS.WORD_LISTS);
  if (!data) {
    // Save defaults
    localStorage.setItem(KEYS.WORD_LISTS, JSON.stringify(DEFAULT_WORD_LISTS));
    return DEFAULT_WORD_LISTS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_WORD_LISTS;
  }
}

export function saveWordList(list: WordList): void {
  const lists = getWordLists();
  const existingIndex = lists.findIndex((l) => l.id === list.id);
  if (existingIndex > -1) {
    lists[existingIndex] = list;
  } else {
    lists.push(list);
  }
  localStorage.setItem(KEYS.WORD_LISTS, JSON.stringify(lists));
}

export function deleteWordList(id: string): void {
  const lists = getWordLists();
  const updated = lists.filter((l) => l.id !== id);
  localStorage.setItem(KEYS.WORD_LISTS, JSON.stringify(updated));
}

export function getWrongWords(): WrongWord[] {
  const data = localStorage.getItem(KEYS.WRONG_WORDS);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function addWrongWord(word: Word): void {
  const wrongWords = getWrongWords();
  const existing = wrongWords.find((ww) => ww.word.toLowerCase() === word.word.toLowerCase());

  if (existing) {
    existing.errorCount += 1;
    existing.lastTested = new Date().toISOString();
    // Update contents in case the word definition has changed
    existing.translation = word.translation;
    existing.phonetic = word.phonetic;
    existing.sentence = word.sentence;
    existing.sentenceTranslation = word.sentenceTranslation;
  } else {
    wrongWords.push({
      id: "ww-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      word: word.word,
      translation: word.translation,
      phonetic: word.phonetic,
      sentence: word.sentence,
      sentenceTranslation: word.sentenceTranslation,
      errorCount: 1,
      lastTested: new Date().toISOString(),
    });
  }
  localStorage.setItem(KEYS.WRONG_WORDS, JSON.stringify(wrongWords));
}

export function removeWrongWord(wordText: string): void {
  const wrongWords = getWrongWords();
  const updated = wrongWords.filter((ww) => ww.word.toLowerCase() !== wordText.toLowerCase());
  localStorage.setItem(KEYS.WRONG_WORDS, JSON.stringify(updated));
}

export function clearWrongWords(): void {
  localStorage.setItem(KEYS.WRONG_WORDS, JSON.stringify([]));
}

// Text-to-Speech (TTS) Voice Utilities
let defaultVoice: SpeechSynthesisVoice | null = null;

// Clean routine to locate a suitable English voice accent (US or UK preferred)
function getEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  if (defaultVoice) return defaultVoice;

  const voices = window.speechSynthesis.getVoices();
  // Try US English
  let voice = voices.find((v) => v.lang === "en-US" || v.lang.startsWith("en_US"));
  if (!voice) {
    // Try any English
    voice = voices.find((v) => v.lang.startsWith("en"));
  }
  if (!voice && voices.length > 0) {
    // Fallback to first voice
    voice = voices[0];
  }
  if (voice) {
    defaultVoice = voice;
  }
  return voice;
}

// Ensure voices are loaded (onVoicesChanged fires asynchronously in some browsers)
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    getEnglishVoice();
  };
}

export function speakEnglishWord(text: string, rate = 0.85): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }

    // Cancel any current speaking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getEnglishVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = rate; // Slightly slower for clear spelling dictation accenting
    utterance.lang = "en-US";

    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = () => {
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
}
