import React, { useState } from "react";
import { Sparkles, CheckCircle2, XCircle, RotateCcw, Home, Award, TrendingUp, AlertTriangle, Play } from "lucide-react";
import { Word, WordList } from "../types";
import { speakEnglishWord } from "../utils/db";

interface DictationReportProps {
  wordList: WordList;
  results: { word: Word; userAnswer: string; isCorrect: boolean }[];
  onRetryAll: () => void;
  onRetryWrongOnly: () => void;
  onGoHome: () => void;
}

export default function DictationReport({ wordList, results, onRetryAll, onRetryWrongOnly, onGoHome }: DictationReportProps) {
  const [filter, setFilter] = useState<"all" | "correct" | "wrong">("all");

  const total = results.length;
  const correctCount = results.filter((r) => r.isCorrect).length;
  const wrongCount = total - correctCount;
  const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // Render different motivational title text depending on accuracy
  const getMotivation = () => {
    if (scorePercent === 100) return { title: "完美收官！(Perfect Score)", desc: "太厉害了！所有单词全部默写正确，请继续保持！", color: "text-emerald-700 bg-emerald-50 border-emerald-100" };
    if (scorePercent >= 80) return { title: "表现优秀！(Superb Work)", desc: "非常优秀的拼写水平，只差一点就能完美通关啦！", color: "text-indigo-700 bg-indigo-50 border-indigo-100" };
    if (scorePercent >= 60) return { title: "及格通过！(Passed)", desc: "熟能生巧，通过错词回顾攻克薄弱环节吧！", color: "text-amber-700 bg-amber-50 border-amber-100" };
    return { title: "再接再厉！(Keep it up)", desc: "没关系，失败乃成功之母。多听音标联想发音，多默写几次很快就能记住！", color: "text-rose-700 bg-rose-50 border-rose-100" };
  };

  const motivation = getMotivation();

  const filteredResults = results.filter((r) => {
    if (filter === "correct") return r.isCorrect;
    if (filter === "wrong") return !r.isCorrect;
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto my-6 animate-fade-in text-slate-800" id="dictation-report">
      {/* Upper score card element */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden mb-6">
        <div className="bg-slate-900 p-8 text-white text-center relative">
          {/* Subtle glow sphere */}
          <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

          <Award className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
          <p className="text-xs font-semibold text-indigo-200 tracking-wider uppercase mb-1">本次听写成绩单</p>
          <h2 className="text-xl font-bold tracking-tight text-white mb-6">{wordList.name}</h2>

          {/* Scoring badge */}
          <div className="inline-flex items-baseline gap-1 bg-white/10 rounded-3xl px-8 py-3.5 border border-white/5 backdrop-blur-md mb-2">
            <span className="text-4xl font-extrabold text-white font-mono">{scorePercent}%</span>
            <span className="text-xs text-indigo-200 uppercase font-medium">准确率</span>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mt-6 border-t border-white/10 pt-4 text-xs">
            <div>
              <p className="text-indigo-200 mb-0.5">测试总数</p>
              <p className="text-lg font-bold font-mono">{total}</p>
            </div>
            <div>
              <p className="text-emerald-300 mb-0.5">拼写正确</p>
              <p className="text-lg font-bold font-mono text-emerald-400">{correctCount}</p>
            </div>
            <div>
              <p className="text-rose-300 mb-0.5">拼写错误</p>
              <p className="text-lg font-bold font-mono text-rose-400">{wrongCount}</p>
            </div>
          </div>
        </div>

        {/* Motivation Card */}
        <div className={`p-5 text-center text-sm border-b border-slate-50 ${motivation.color}`} id="motivation-box">
          <p className="font-bold flex items-center justify-center gap-1.5 mb-1">
            <Sparkles className="w-4 h-4 inline" />
            {motivation.title}
          </p>
          <p className="text-xs opacity-90">{motivation.desc}</p>
        </div>

        {/* Actions panel */}
        <div className="p-6 bg-slate-50/50 flex flex-col sm:flex-row gap-3 border-b border-slate-100" id="report-actions">
          <button
            onClick={onRetryAll}
            className="flex-1 py-3 px-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm text-slate-700"
            id="retry-all-btn"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            重新默写全书
          </button>

          {wrongCount > 0 ? (
            <button
              onClick={onRetryWrongOnly}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-100"
              id="retry-wrong-btn"
            >
              <AlertTriangle className="w-4 h-4 text-indigo-200" />
              仅重新默写错词 ({wrongCount}个)
            </button>
          ) : (
            <button
              onClick={onGoHome}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-100"
              id="return-home-cta"
            >
              <Home className="w-4 h-4" />
              开启新默写
            </button>
          )}
        </div>
      </div>

      {/* Breakdown list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6" id="report-breakdown-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="font-bold text-slate-900 text-base">拼写清单明细 (Spelling Grid)</h3>

          {/* Segmented control filters */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs gap-1" id="report-filters">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
              id="filter-all-btn"
            >
              全部 ({total})
            </button>
            <button
              onClick={() => setFilter("correct")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === "correct" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
              id="filter-correct-btn"
            >
              正确 ({correctCount})
            </button>
            <button
              onClick={() => setFilter("wrong")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === "wrong" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
              id="filter-wrong-btn"
            >
              错误 ({wrongCount})
            </button>
          </div>
        </div>

        {/* Word breakdown records */}
        <div className="divide-y divide-slate-100" id="breakdown-records-container">
          {filteredResults.map((item, index) => (
            <div key={item.word.id} className="py-4 flex items-start justify-between gap-4 group" id={`record-${item.word.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
                  <span className="font-extrabold text-slate-900 text-lg font-mono tracking-wide">
                    {item.word.word}
                  </span>
                  <span className="text-xs text-slate-400 font-mono italic">
                    {item.word.phonetic}
                  </span>
                  <span className="text-xs text-slate-500 px-2 py-0.5 rounded-full bg-slate-100">
                    {item.word.translation}
                  </span>
                </div>

                {/* Example sentence segment */}
                {item.word.sentence && (
                  <p className="text-xs text-slate-500 font-serif italic mb-1.5 pl-2 border-l-2 border-slate-100">
                    “ {item.word.sentence} ”
                  </p>
                )}

                {/* User spelling answer details */}
                <div className="text-xs flex items-center gap-1.5">
                  <span className="text-slate-400">您的答案:</span>
                  {item.isCorrect ? (
                    <span className="text-emerald-700 font-bold font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {item.userAnswer} (正确)
                    </span>
                  ) : (
                    <span className="text-rose-700 font-bold font-mono bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                      {item.userAnswer || "(空白未写)"} (错误)
                    </span>
                  )}
                </div>
              </div>

              {/* Action column (Play voice/status check) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => speakEnglishWord(item.word.word)}
                  className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                  title="点击语音朗读"
                  id={`play-sound-btn-${item.word.id}`}
                >
                  <Play className="w-4 h-4 fill-slate-400/10" />
                </button>

                {item.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500" />
                )}
              </div>
            </div>
          ))}

          {filteredResults.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-medium text-xs">
              无符合当前筛选条件的单词条目。
            </div>
          )}
        </div>

        {/* Go back Catalog */}
        <div className="flex justify-center mt-8 border-t border-slate-100 pt-6">
          <button
            onClick={onGoHome}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            id="final-return-home-btn"
          >
            <Home className="w-4 h-4" />
            返回主界面 (Go to Catalog)
          </button>
        </div>
      </div>
    </div>
  );
}
