import React, { useState, useEffect, useRef } from "react";
import { Volume2, HelpCircle, CheckCircle, XCircle, ArrowRight, RotateCcw, AlertTriangle, Sparkles, BookOpen, Volume1, Lightbulb } from "lucide-react";
import { Word, WordList, WrongWord } from "../types";
import { speakEnglishWord, addWrongWord } from "../utils/db";

interface DictationArenaProps {
  wordList: WordList;
  onComplete: (sessionResults: { word: Word; userAnswer: string; isCorrect: boolean }[]) => void;
  onCancel: () => void;
}

export default function DictationArena({ wordList, onComplete, onCancel }: DictationArenaProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [status, setStatus] = useState<"typing" | "answered">("typing");
  const [isCorrect, setIsCorrect] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ word: Word; userAnswer: string; isCorrect: boolean }[]>([]);
  const [speechRate, setSpeechRate] = useState(0.8); // 0.8 is standard clear spelling tempo
  const [showPhoneticHint, setShowPhoneticHint] = useState(false);
  const [showSentenceHint, setShowSentenceHint] = useState(false);

  const currentWord = wordList.words[currentIndex];
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-speak word aloud when current vocabulary item updates
  useEffect(() => {
    if (currentWord) {
      triggerSpeak();
    }
    // Reset state per vocabulary word
    setUserAnswer("");
    setStatus("typing");
    setShowPhoneticHint(false);
    setShowSentenceHint(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  }, [currentIndex]);

  const triggerSpeak = (rateOverride?: number) => {
    if (currentWord) {
      speakEnglishWord(currentWord.word, rateOverride || speechRate);
    }
  };

  const triggerSpeakSentence = () => {
    if (currentWord && currentWord.sentence) {
      speakEnglishWord(currentWord.sentence, 0.9);
    }
  };

  const handleSubmitAnswer = () => {
    if (status !== "typing" || !currentWord) return;

    const trimmedAnswer = userAnswer.trim().toLowerCase();
    const correctTarget = currentWord.word.trim().toLowerCase();
    const isCorrectSpelling = trimmedAnswer === correctTarget;

    setIsCorrect(isCorrectSpelling);
    setStatus("answered");

    // Add wrong word automatically to wrong word bank (persistent state)
    if (!isCorrectSpelling) {
      addWrongWord(currentWord);
    }

    // Capture results
    setSessionResults((prev) => [
      ...prev,
      {
        word: currentWord,
        userAnswer: trimmedAnswer,
        isCorrect: isCorrectSpelling,
      },
    ]);
  };

  const handleNextWord = () => {
    if (currentIndex < wordList.words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Complete dictation list
      onComplete([
        ...sessionResults,
      ]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (status === "typing") {
        handleSubmitAnswer();
      } else {
        handleNextWord();
      }
    }
  };

  if (!currentWord) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 max-w-xl mx-auto" id="arena-empty-state">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">未发现待默写单词</h3>
        <button onClick={onCancel} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm" id="empty-state-btn">返回列表</button>
      </div>
    );
  }

  // Calculate percentage of progress
  const progressPercent = Math.round(((currentIndex + (status === "answered" ? 1 : 0)) / wordList.words.length) * 100);

  return (
    <div className="max-w-xl mx-auto my-6" id="dictation-arena">
      {/* Progress banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl shadow-slate-100/40 mb-6">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
            BOOK: {wordList.name}
          </span>
          <span className="text-sm font-bold text-indigo-600">
            {currentIndex + 1} / {wordList.words.length} <span className="text-xs text-slate-400">单词</span>
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Dictation Box */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col items-center text-center relative overflow-hidden">
        {/* Decorative corner circles */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/30 rounded-bl-full pointer-events-none" />

        {/* Big Audio Trigger button */}
        <div className="relative group mb-8">
          <button
            onClick={() => triggerSpeak()}
            className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-105 transition-all text-center cursor-pointer"
            id="arena-speak-btn"
            title="听写发音"
          >
            <Volume2 className="w-10 h-10 animate-pulse" />
          </button>
        </div>

        {/* Speed Adjustment Sliders */}
        <div className="flex items-center gap-6 mb-8 text-xs text-slate-500 font-medium bg-slate-50 px-4 py-2 rounded-xl" id="speed-indicator">
          <span>发音速度设定: </span>
          <div className="flex gap-3">
            <button
              onClick={() => { setSpeechRate(1.0); triggerSpeak(1.0); }}
              className={`px-2.5 py-1 rounded ${speechRate === 1.0 ? "bg-white text-indigo-600 font-bold shadow-sm" : "hover:text-slate-800"}`}
              id="speed-btn-normal"
            >
              正常 (1.0x)
            </button>
            <button
              onClick={() => { setSpeechRate(0.8); triggerSpeak(0.8); }}
              className={`px-2.5 py-1 rounded ${speechRate === 0.8 ? "bg-white text-indigo-600 font-bold shadow-sm" : "hover:text-slate-800"}`}
              id="speed-btn-slow"
            >
              稍慢 (0.8x)
            </button>
            <button
              onClick={() => { setSpeechRate(0.65); triggerSpeak(0.65); }}
              className={`px-2.5 py-1 rounded ${speechRate === 0.65 ? "bg-white text-indigo-600 font-bold shadow-sm" : "hover:text-slate-800"}`}
              id="speed-btn-veryslow"
            >
              极慢 (0.6x)
            </button>
          </div>
        </div>

        {/* Translation Guidance Clue */}
        <div className="mb-6 max-w-md" id="clue-card">
          <span className="text-xs uppercase font-extrabold text-slate-400 block mb-1 tracking-wider">中文释义</span>
          <p className="text-lg font-bold text-slate-800 leading-normal mb-2">
            {currentWord.translation}
          </p>
        </div>

        {/* Floating hints button */}
        <div className="flex gap-2.5 mb-8" id="hint-panel">
          <button
            onClick={() => setShowPhoneticHint(!showPhoneticHint)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showPhoneticHint
                ? "bg-amber-50 text-amber-700 border border-amber-100"
                : "bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-100"
            }`}
            id="hint-btn-phonetic"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {showPhoneticHint ? `音标: ${currentWord.phonetic}` : "提示国际音标"}
          </button>

          {currentWord.sentence && (
            <button
              onClick={() => {
                setShowSentenceHint(!showSentenceHint);
                if (!showSentenceHint) {
                  triggerSpeakSentence();
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                showSentenceHint
                  ? "bg-sky-50 text-sky-700 border border-sky-100"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-100"
              }`}
              id="hint-btn-sentence"
            >
              <Volume1 className="w-3.5 h-3.5" />
              {showSentenceHint ? "隐藏例句" : "听 AI 助记例句"}
            </button>
          )}
        </div>

        {/* Display sentence hint box */}
        {showSentenceHint && currentWord.sentence && (
          <div className="w-full bg-slate-50/80 rounded-2xl p-4 border border-slate-100 mb-8 text-left animate-fade-in" id="sentence-hint-box">
            <span className="text-[10px] bg-sky-100 text-sky-800 font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase mb-1.5 inline-block">
              Dictation Clue Block / 例句默写提示
            </span>
            <p className="text-sm font-medium text-slate-700 leading-relaxed font-serif">
              {/* Replace the target word with blanks so they have practice writing it */}
              {currentWord.sentence.split(new RegExp(`\\b${currentWord.word}\\b`, "i")).map((part, i, arr) => (
                <React.Fragment key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="inline-block border-b-2 border-indigo-500 text-indigo-600 font-bold px-2 mx-1 animate-pulse font-sans">
                      [_____]
                    </span>
                  )}
                </React.Fragment>
              ))}
            </p>
            <p className="text-xs text-slate-400 mt-1">{currentWord.sentenceTranslation}</p>
          </div>
        )}

        {/* Spelling Input Field */}
        <div className="w-full max-w-sm mb-6 relative">
          <input
            ref={inputRef}
            type="text"
            className={`w-full px-5 py-3.5 rounded-2xl border text-center text-xl font-bold font-mono tracking-widest focus:outline-none focus:ring-4 transition-all ${
              status === "answered"
                ? isCorrect
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 ring-emerald-100"
                  : "bg-rose-50 border-rose-300 text-rose-800 ring-rose-100"
                : "bg-slate-50/50 border-slate-200 text-slate-800 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white"
            }`}
            placeholder={status === "typing" ? "在此拼写单词..." : ""}
            value={userAnswer}
            onChange={(e) => {
              if (status === "typing") {
                setUserAnswer(e.target.value);
              }
            }}
            onKeyDown={handleKeyPress}
            disabled={status === "answered"}
            id="spelling-input-field"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          {status === "answered" && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {isCorrect ? (
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-600" />
              )}
            </div>
          )}
        </div>

        {/* Immediate corrected display */}
        {status === "answered" && (
          <div className="mb-8 p-4 rounded-2xl w-full bg-slate-50 border border-slate-100 flex flex-col items-center animate-fade-in" id="feedback-panel">
            <span className="text-xs font-bold text-slate-400 uppercase mb-1">标准拼写 (Correct Answer)</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-indigo-600 font-mono tracking-wider">{currentWord.word}</span>
              <span className="text-xs text-slate-500 font-mono bg-indigo-50/60 px-2 py-0.5 rounded-full">{currentWord.phonetic}</span>
            </div>
            {!isCorrect && (
              <p className="text-xs text-slate-400 mt-2">
                您的拼写: <span className="font-mono font-semibold text-rose-600 decoration-rose-400 line-through">{userAnswer || "(未填写)"}</span>
              </p>
            )}

            {currentWord.sentence && (
              <div className="mt-3 text-xs text-left text-slate-600 w-full border-t border-slate-100 pt-3">
                <p className="font-serif italic font-medium">“ {currentWord.sentence} ”</p>
                <p className="text-slate-400 mt-0.5">{currentWord.sentenceTranslation}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions Button */}
        <div className="w-full max-w-sm flex gap-4" id="arena-action-buttons">
          {status === "typing" ? (
            <>
              <button
                onClick={() => setUserAnswer(currentWord.word)}
                className="flex-1 py-3 text-slate-500 hover:text-slate-800 bg-slate-100/60 hover:bg-slate-100 font-bold text-sm rounded-xl transition-all cursor-pointer"
                id="give-up-btn"
              >
                直接提示答案
              </button>
              <button
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim()}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                id="submit-answer-btn"
              >
                递交核对 (Enter)
              </button>
            </>
          ) : (
            <button
              onClick={handleNextWord}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
              id="next-word-btn"
            >
              {currentIndex < wordList.words.length - 1 ? (
                <>
                  下一个单词
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                "结束并查看报告 (View Report)"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Footer exits */}
      <div className="flex justify-center mt-6">
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1.5"
          id="exit-arena-btn"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          中断本次默写，退出训练
        </button>
      </div>
    </div>
  );
}
