export interface Word {
  id: string;
  word: string;
  translation: string;
  phonetic: string;
  sentence: string;
  sentenceTranslation: string;
  createdAt: string;
}

export interface WordList {
  id: string;
  name: string;
  words: Word[];
  createdAt: string;
}

export interface WrongWord {
  id: string;
  word: string;
  translation: string;
  phonetic: string;
  sentence: string;
  sentenceTranslation: string;
  errorCount: number;
  lastTested: string;
}

export type DictationMode = "listen" | "clue";

export interface DictationItemResult {
  word: Word;
  userAnswer: string;
  isCorrect: boolean;
  timestamp: string;
}

export interface DictationSession {
  id: string;
  name: string;
  items: Word[];
  results: DictationItemResult[];
  currentIndex: number;
  mode: DictationMode;
  isCompleted: boolean;
}
