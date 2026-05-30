import React, { useState, useEffect } from "react";
import { Search, Trash2, CheckCircle, Play, AlertTriangle, Sparkles, Star, BookOpen, RotateCcw } from "lucide-react";
import { WrongWord, WordList } from "../types";
import { getWrongWords, removeWrongWord, clearWrongWords, speakEnglishWord } from "../utils/db";

interface WrongWordBankProps {
  onStartTesting: (mockList: WordList) => void;
  onGoBack: () => void;
}

export default function WrongWordBank({ onStartTesting, onGoBack }: WrongWordBankProps) {
  const [items, setItems] = useState<WrongWord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadWords = () => {
    setItems(getWrongWords());
  };

  useEffect(() => {
    loadWords();
  }, []);

  const handleRemove = (wordText: string) => {
    removeWrongWord(wordText);
    loadWords();
  };

  const handleClearAll = () => {
    if (window.confirm("确定要清空您所有的错词记录吗？这项操作不可撤销。")) {
      clearWrongWords();
      loadWords();
    }
  };

  // Convert wrong words into a temporary WordList structure for dictation
  const handleTestWrongOnly = () => {
    if (items.length === 0) return;

    const mockWordList: WordList = {
      id: "mock-wrong-list-" + Date.now(),
      name: "错词强化集中训练营 (Misspelled Words Challenge)",
      createdAt: new Date().toISOString(),
      words: items.map((ww) => ({
        id: ww.id,
        word: ww.word,
        translation: ww.translation,
        phonetic: ww.phonetic,
        sentence: ww.sentence,
        sentenceTranslation: ww.sentenceTranslation,
        createdAt: ww.lastTested,
      })),
    };

    onStartTesting(mockWordList);
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      item.word.toLowerCase().includes(q) ||
      item.translation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto my-6 animate-fade-in text-slate-800" id="wrong-word-bank">
      {/* Title bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            我的个性化错词本 (Wrong Word Reviewer)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            系统会自动把您在默写过程中拼错的单词记录在这里，记录其错误频次。掌握后点击消除即可。
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto shrink-0">
          {items.length > 0 && (
            <>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                id="clear-all-wrong-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清空错词记录
              </button>
              <button
                onClick={handleTestWrongOnly}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-[1.02] shadow-md shadow-indigo-100 cursor-pointer"
                id="test-wrong-btn"
              >
                <Sparkles className="w-3.5 h-3.5" />
                立即训练这些错词 ({items.length}个)
              </button>
            </>
          )}
          <button
            onClick={onGoBack}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium cursor-pointer"
            id="wrong-bank-back"
          >
            返回
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden p-6">
        {/* Search tool */}
        <div className="relative mb-6">
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            placeholder="搜寻您的特定错词或中文翻译..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="wrong-word-search"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* List layout */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="wrong-words-grid">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-5 border border-slate-150 rounded-2xl bg-white hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                id={`wrong-item-${item.id}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-slate-900 text-lg font-mono tracking-wider">
                      {item.word}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-700 font-extrabold px-2 py-0.5 rounded-full">
                        拼错 {item.errorCount} 次
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 font-mono mb-2">[ {item.phonetic} ]</p>
                  <p className="text-sm font-semibold text-slate-700 mb-3">{item.translation}</p>

                  {item.sentence && (
                    <div className="bg-slate-50/75 p-3 rounded-xl border border-slate-100 mb-4 text-left">
                      <p className="text-xs font-serif italic text-slate-600 leading-relaxed">
                        “ {item.sentence} ”
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">{item.sentenceTranslation}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-400">
                    最后拼错: {new Date(item.lastTested).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => speakEnglishWord(item.word)}
                      className="p-2 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors cursor-pointer"
                      title="朗读"
                      id={`wrong-speak-${item.id}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-500/10" />
                    </button>
                    <button
                      onClick={() => handleRemove(item.word)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="我已掌握，从错词本消去"
                      id={`wrong-mastered-${item.id}`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      已记住
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 max-w-md mx-auto" id="wrong-bank-empty">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h4 className="text-base font-bold text-slate-800 mb-1">完美的错词本状态</h4>
            {searchQuery ? (
              <p className="text-xs">未找到任何符合 “{searchQuery}” 查询条件的错词。</p>
            ) : (
              <p className="text-xs">
                当您进行听写练习并拼错单词时，拼错的单词会自动添加至此，以便集中复习训练。当前没有错词，加油！
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
