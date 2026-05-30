import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Sparkles, Star, ChevronDown, ChevronUp, Trash2, Volume2, AlertCircle, RefreshCw, FileText, Upload, BrainCircuit } from "lucide-react";
import { Word, WordList } from "./types";
import { getWordLists, deleteWordList, getWrongWords, speakEnglishWord } from "./utils/db";
import WordImporter from "./components/WordImporter";
import WordBatchSetup from "./components/WordBatchSetup";
import DictationArena from "./components/DictationArena";
import DictationReport from "./components/DictationReport";
import WrongWordBank from "./components/WrongWordBank";

export default function App() {
  const [view, setView] = useState<"catalog" | "import" | "setup" | "arena" | "report" | "wrong-bank">("catalog");
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [wrongWordsCount, setWrongWordsCount] = useState(0);

  // Interaction selectors
  const [selectedWordList, setSelectedWordList] = useState<WordList | null>(null);
  const [extractedWords, setExtractedWords] = useState<string[]>([]);
  const [currentSessionResults, setCurrentSessionResults] = useState<{ word: Word; userAnswer: string; isCorrect: boolean }[]>([]);
  
  // UI expansions
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<{ ok: boolean; hasApiKey: boolean; provider: string }>({ 
    ok: true, 
    hasApiKey: true, 
    provider: "none" 
  });

  // Sync data on load and during state changes
  const reloadData = () => {
    setWordLists(getWordLists());
    setWrongWordsCount(getWrongWords().length);
  };

  useEffect(() => {
    reloadData();
    
    // Check system API credentials/setup
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setHealthStatus({ 
          ok: true, 
          hasApiKey: !!data.hasApiKey, 
          provider: data.provider || "none" 
        });
      })
      .catch((err) => {
        console.error("Health check error:", err);
      });
  }, [view]);

  // Handle successful image/file extraction
  const handleWordsImported = (words: string[]) => {
    setExtractedWords(words);
    setView("setup");
  };

  // Start actual testing activity
  const startTesting = (list: WordList) => {
    setSelectedWordList(list);
    setView("arena");
  };

  const handleDictationComplete = (results: { word: Word; userAnswer: string; isCorrect: boolean }[]) => {
    setCurrentSessionResults(results);
    setView("report");
  };

  const handleRetryAll = () => {
    if (selectedWordList) {
      setView("arena");
    }
  };

  const handleRetryWrongOnly = () => {
    if (!selectedWordList) return;

    const wrongOnlyWords = currentSessionResults
      .filter((r) => !r.isCorrect)
      .map((r) => r.word);

    const mockList: WordList = {
      id: "retry-wrong-list-" + Date.now(),
      name: `针对性错词补习: ${selectedWordList.name}`,
      createdAt: new Date().toISOString(),
      words: wrongOnlyWords,
    };

    setSelectedWordList(mockList);
    setView("arena");
  };

  const handleDeleteList = (id: string, name: string) => {
    if (window.confirm(`确定要彻底删除 "${name}" 吗？该操作不会清空您的错词本数据。`)) {
      deleteWordList(id);
      reloadData();
    }
  };

  // Render visual states
  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans" id="english-word-dictation-app">
      {/* Absolute top micro notification header */}
      {!healthStatus.hasApiKey && (
        <div className="bg-amber-500 text-white py-2 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2" id="api-key-warning">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>检测到未配置大模型 API Key。一键智能填充释义、句释功能暂不可用。请在后台 Settings ➔ Secrets 处添加 GEMINI_API_KEY 或 DEEPSEEK_API_KEY。</span>
        </div>
      )}

      {/* Main Header / Navigation */}
      <header className="bg-white border-b border-rose-100/10 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView("catalog")} id="nav-brand">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-100 text-white">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">AI 智能单词默写助手</h1>
                {healthStatus.hasApiKey && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider ${
                    healthStatus.provider === "deepseek" 
                      ? "bg-blue-50 text-blue-600 border border-blue-200" 
                      : "bg-indigo-50 text-indigo-600 border border-indigo-200"
                  }`}>
                    {healthStatus.provider === "deepseek" ? "DeepSeek" : "Gemini"}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Spelling Dictation & Review</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("wrong-bank")}
              className="relative px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              id="header-wrong-words-btn"
            >
              <Star className="w-3.5 h-3.5 text-rose-500 fill-rose-400" />
              <span>错词本回顾</span>
              {wrongWordsCount > 0 && (
                <span className="bg-rose-600 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.5 ml-0.5">
                  {wrongWordsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { setView("import"); }}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-indigo-100"
              id="header-quick-add-btn"
            >
              <Plus className="w-4 h-4" />
              引入新词库
            </button>
          </div>
        </div>
      </header>

      {/* Primary body view portal */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        
        {view === "catalog" && (
          <div className="space-y-8 animate-fade-in" id="catalog-view">
            {/* Quick Hero dashboard widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="dashboard-statistics">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl shadow-slate-100/30 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">本地单词本 (Wordbooks)</p>
                  <p className="text-2xl font-extrabold text-slate-900 font-mono mt-1">{wordLists.length} <span className="text-xs text-slate-400 font-normal">本</span></p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl shadow-slate-100/30 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">词汇总量 (Vocabulary total)</p>
                  <p className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                    {wordLists.reduce((acc, list) => acc + list.words.length, 0)} <span className="text-xs text-slate-400 font-normal">词</span>
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl shadow-slate-100/30 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Star className="w-6 h-6 fill-rose-50 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">待消化错词 (Misspelled tracking)</p>
                  <p className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                    {wrongWordsCount} <span className="text-xs text-slate-400 font-normal">个</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick entry for creating new wordlists */}
            <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl" id="creation-entry-banner">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-xl">
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full mb-3 inline-block">
                  智能 AI 重塑默写体验
                </span>
                <h2 className="text-2xl font-bold tracking-tight mb-2">一键上传图片或文档，极速生成拼写词表</h2>
                <p className="text-sm text-indigo-200/90 leading-relaxed mb-6">
                  无论是用手机拍照课本、讲义，还是拖拽上传日常 TXT/CSV 词汇表。Gemini 会自动为您结构化拼写词本，生成精确音标、通俗翻译，以及量身定制的语境默写辅助句。
                </p>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => setView("import")}
                    className="px-5 py-3 bg-white text-indigo-950 font-bold text-xs rounded-xl hover:bg-indigo-50 transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                    id="cta-upload-image"
                  >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    拍照或上传图片识别 (OCR 提取)
                  </button>
                  <button
                    onClick={() => setView("import")}
                    className="px-5 py-3 bg-indigo-700 hover:bg-indigo-600 text-white border border-indigo-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                    id="cta-import-doc"
                  >
                    <FileText className="w-4 h-4" />
                    导入 TXT 文件生成听写
                  </button>
                </div>
              </div>
            </div>

            {/* Word lists catalog list */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <BookOpen className="w-4.5 h-4.5 text-indigo-600" />
                  我的专属单词书 ({wordLists.length})
                </h3>
              </div>

              <div className="space-y-4" id="wordlist-catalog">
                {wordLists.map((list) => {
                  const isExpanded = expandedListId === list.id;
                  return (
                    <div
                      key={list.id}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                      id={`list-card-${list.id}`}
                    >
                      {/* List summary strip */}
                      <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            {list.name}
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded">
                              {list.words.length}词
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400">
                            创建时间: {new Date(list.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Control buttons inside list header */}
                        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
                          <button
                            onClick={() => setExpandedListId(isExpanded ? null : list.id)}
                            className="px-3.5 py-2 bg-slate-50 text-slate-600 border border-slate-100 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                            id={`expand-btn-${list.id}`}
                          >
                            <span>单词大盘库 ({isExpanded ? "收起" : "展开"})</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {list.id !== "default-1" && (
                            <button
                              onClick={() => handleDeleteList(list.id, list.name)}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                              title="删除词本"
                              id={`delete-btn-${list.id}`}
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          )}

                          <button
                            onClick={() => startTesting(list)}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-md shadow-indigo-100 cursor-pointer"
                            id={`start-test-btn-${list.id}`}
                          >
                            <BrainCircuit className="w-4 h-4 shrink-0" />
                            一键开始单词听写之旅 (Dictate)
                          </button>
                        </div>
                      </div>

                      {/* Expanded Word lookups */}
                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-slate-50 pt-5 bg-slate-50/20" id={`expanded-inner-${list.id}`}>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {list.words.map((item) => (
                              <div
                                key={item.id}
                                className="p-4 bg-white border border-slate-100 rounded-xl flex flex-col justify-between"
                                id={`sub-item-${item.id}`}
                              >
                                <div>
                                  <div className="flex justify-between items-baseline mb-1">
                                    <span className="font-bold text-slate-900 text-base font-mono tracking-wider">{item.word}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{item.phonetic}</span>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-600 mb-2">{item.translation}</p>
                                  
                                  {item.sentence && (
                                    <div className="mt-2 text-left pl-2 border-l-2 border-slate-100">
                                      <p className="text-[10px] text-slate-500 font-serif italic line-clamp-2">
                                        “ {item.sentence} ”
                                      </p>
                                      <p className="text-[9px] text-slate-400 line-clamp-1">{item.sentenceTranslation}</p>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-3 flex justify-end">
                                  <button
                                    onClick={() => speakEnglishWord(item.word)}
                                    className="p-1 px-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded text-xs flex items-center gap-1"
                                    id={`speak-sub-${item.id}`}
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                    <span>发音朗读</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {wordLists.length === 0 && (
                  <div className="py-16 text-center text-slate-400 max-w-sm mx-auto" id="catalog-empty-placeholder">
                    <p className="text-sm font-semibold mb-2">未发现任何听写词本</p>
                    <p className="text-xs">您可以点击右上角“引入新词库”通过拍照或文本快速导入您的第一份拼写单词书。</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === "import" && (
          <WordImporter
            onWordsImported={handleWordsImported}
            onCancel={() => setView("catalog")}
          />
        )}

        {view === "setup" && (
          <WordBatchSetup
            initialWords={extractedWords}
            onComplete={() => {
              reloadData();
              setView("catalog");
            }}
            onCancel={() => setView("import")}
          />
        )}

        {view === "arena" && selectedWordList && (
          <DictationArena
            wordList={selectedWordList}
            onComplete={handleDictationComplete}
            onCancel={() => setView("catalog")}
          />
        )}

        {view === "report" && selectedWordList && (
          <DictationReport
            wordList={selectedWordList}
            results={currentSessionResults}
            onRetryAll={handleRetryAll}
            onRetryWrongOnly={handleRetryWrongOnly}
            onGoHome={() => setView("catalog")}
          />
        )}

        {view === "wrong-bank" && (
          <WrongWordBank
            onStartTesting={(mockList) => {
              setSelectedWordList(mockList);
              setView("arena");
            }}
            onGoBack={() => setView("catalog")}
          />
        )}

      </main>

      {/* Footer footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-slate-400 text-xs font-medium" id="app-footer">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AI 英语智能拼写课外演练工具</p>
          <div className="flex gap-4">
            <span className="text-slate-300">|</span>
            <p>基于 Gemini 3.5 全方位智能辅导例句生成技术</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
