import React, { useState } from "react";
import { Sparkles, Loader2, AlertCircle, Trash2, Edit2, Check, BookMarked, Save, Plus } from "lucide-react";
import { Word, WordList } from "../types";
import { saveWordList } from "../utils/db";

interface WordBatchSetupProps {
  initialWords: string[];
  onComplete: () => void;
  onCancel: () => void;
}

interface TempWord {
  id: string;
  word: string;
  translation: string;
  phonetic: string;
  sentence: string;
  sentenceTranslation: string;
  isAiPopulated: boolean;
}

export default function WordBatchSetup({ initialWords, onComplete, onCancel }: WordBatchSetupProps) {
  const [tempWords, setTempWords] = useState<TempWord[]>(() =>
    initialWords.map((w, index) => ({
      id: `temp-${Date.now()}-${index}`,
      word: w.toLowerCase().trim(),
      translation: "",
      phonetic: "",
      sentence: "",
      sentenceTranslation: "",
      isAiPopulated: false,
    }))
  );

  const [listName, setListName] = useState("AI 识别导入单词书");
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [currentProgress, setCurrentProgress] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);

  // New word manually added inline
  const [newWordInput, setNewWordInput] = useState("");

  const handleAddNewWord = () => {
    const fresh = newWordInput.trim().toLowerCase();
    if (!fresh) return;
    if (tempWords.some((w) => w.word === fresh)) {
      setErrorText(`单词 "${fresh}" 已经在当前待处理列表中了。`);
      return;
    }
    setTempWords((prev) => [
      ...prev,
      {
        id: `temp-manual-${Date.now()}`,
        word: fresh,
        translation: "",
        phonetic: "",
        sentence: "",
        sentenceTranslation: "",
        isAiPopulated: false,
      },
    ]);
    setNewWordInput("");
    setErrorText(null);
  };

  const handleDeleteTemp = (id: string) => {
    setTempWords((prev) => prev.filter((w) => w.id !== id));
  };

  const handleEditInlineField = (id: string, field: keyof TempWord, value: string) => {
    setTempWords((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    );
  };

  // Triggers Gemini API to populate all translations, phonetics, examples chunk-by-chunk
  const handleAiAutoFill = async () => {
    const unpopulated = tempWords.filter((w) => !w.isAiPopulated || !w.translation);
    if (unpopulated.length === 0) {
      setErrorText("所有单词已获得 AI 释义填补。");
      return;
    }

    setLoading(true);
    setErrorText(null);
    setCurrentProgress(0);

    // Chunk size 8 to protect model request limit and response boundaries gracefully
    const chunkSize = 8;
    const wordsToFetch = unpopulated.map((w) => w.word);
    const totalWords = wordsToFetch.length;

    try {
      const resultsMap: Record<string, any> = {};

      for (let i = 0; i < totalWords; i += chunkSize) {
        const chunk = wordsToFetch.slice(i, i + chunkSize);
        setProgressText(`AI 正在解构第 ${i + 1} 至 ${Math.min(i + chunkSize, totalWords)} 个词的音标与场景例句 (${i}/${totalWords})...`);
        
        const response = await fetch("/api/generate-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words: chunk }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "获取单词释义失败");
        }

        const data = await response.json();
        if (data.details && Array.isArray(data.details)) {
          data.details.forEach((item: any) => {
            if (item && item.word) {
              resultsMap[item.word.toLowerCase().trim()] = item;
            }
          });
        }

        const percent = Math.round(((i + chunk.length) / totalWords) * 100);
        setCurrentProgress(percent);
      }

      // Merge results back to local items
      setTempWords((prev) =>
        prev.map((w) => {
          const aiMatch = resultsMap[w.word.toLowerCase().trim()];
          if (aiMatch) {
            return {
              ...w,
              translation: aiMatch.translation || w.translation,
              phonetic: aiMatch.phonetic || w.phonetic,
              sentence: aiMatch.sentence || w.sentence,
              sentenceTranslation: aiMatch.sentenceTranslation || w.sentenceTranslation,
              isAiPopulated: true,
            };
          }
          return w;
        })
      );

      setProgressText("AI 释义及例句已填充完毕！");
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "一键拼写释义填充失败，请检查网络后重试。");
    } finally {
      setLoading(false);
    }
  };

  // Submit and save list
  const handleSaveList = () => {
    if (!listName.trim()) {
      setErrorText("请输入单词书名称。");
      return;
    }
    if (tempWords.length === 0) {
      setErrorText("列表不能为空，请至少添加一个单词。");
      return;
    }

    const uncompletedCount = tempWords.filter((w) => !w.translation.trim()).length;
    if (uncompletedCount > 0) {
      setErrorText(`有 ${uncompletedCount} 个词未填充中文翻译。建议使用上方 'AI智能释义填充'，或手动填写以供拼写参考。`);
      return;
    }

    // Convert TempWords to durable Word structure
    const words: Word[] = tempWords.map((tw) => ({
      id: "w-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      word: tw.word.trim().toLowerCase(),
      translation: tw.translation.trim(),
      phonetic: tw.phonetic.trim() || "/.../",
      sentence: tw.sentence.trim(),
      sentenceTranslation: tw.sentenceTranslation.trim(),
      createdAt: new Date().toISOString(),
    }));

    const wordList: WordList = {
      id: "list-" + Date.now(),
      name: listName.trim(),
      createdAt: new Date().toISOString(),
      words,
    };

    saveWordList(wordList);
    onComplete();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 max-w-5xl mx-auto my-6" id="word-batch-setup">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-600" />
            新建或检查待入库单词 ({tempWords.length}个)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            您可以增加、删除、修改单词。点击 AI 自动填充，将极速调取 Gemini 生成音标、翻译、以及拼写训练例句。
          </p>
        </div>

        {/* List name input */}
        <div className="w-full md:w-64">
          <label className="text-xs font-semibold text-slate-500 block mb-1">单词本名称</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-medium focus:bg-white focus:outline-indigo-500"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="例如：默写第三课, Lesson 3"
            id="list-name-input"
          />
        </div>
      </div>

      {errorText && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-3 text-sm animate-fade-in" id="batch-setup-error">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="flex-1">{errorText}</p>
        </div>
      )}

      {/* Progress display if AI generating */}
      {loading && (
        <div className="mb-6 p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl animate-pulse" id="batch-setup-loading">
          <div className="flex items-center gap-3 text-indigo-950 mb-3 text-sm font-semibold">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>{progressText}</span>
            <span className="ml-auto text-xs text-indigo-600">{currentProgress}%</span>
          </div>
          <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Control Tools bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6" id="batch-control-bar">
        {/* Manual typing append inline */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            className="w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-indigo-500"
            placeholder="手动补录英文单词..."
            value={newWordInput}
            onChange={(e) => setNewWordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddNewWord()}
            id="manual-append-input"
          />
          <button
            onClick={handleAddNewWord}
            className="px-3.5 py-2 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            id="manual-append-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            添加
          </button>
        </div>

        {/* Big Smart Spark fill button */}
        <button
          onClick={handleAiAutoFill}
          disabled={loading}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-100 cursor-pointer"
          id="ai-fill-details-btn"
        >
          <Sparkles className="w-4 h-4" />
          AI智能释义一键填充 (Phonetics & Sentences)
        </button>
      </div>

      {/* Scrollable table container */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[480px] overflow-y-auto mb-8 shadow-inner" id="words-table-container">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-xs font-semibold sticky top-0 border-b border-slate-100 z-10">
            <tr>
              <th className="p-4 w-28">原词 (Word)</th>
              <th className="p-4 w-28 font-mono">音标 (IPA)</th>
              <th className="p-4 w-36">翻译 (Translation)</th>
              <th className="p-4">AI 例句背诵 (Example Sentence / Dictation Clue)</th>
              <th className="p-4 w-24 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {tempWords.map((tw) => (
              <tr key={tw.id} className="hover:bg-slate-50/40 transition-colors">
                <td className="p-4">
                  <input
                    type="text"
                    value={tw.word}
                    onChange={(e) => handleEditInlineField(tw.id, "word", e.target.value)}
                    className="w-full bg-transparent font-semibold text-slate-800 focus:bg-white focus:outline focus:outline-indigo-100 rounded px-1.5 py-1"
                    id={`field-word-${tw.id}`}
                  />
                </td>
                <td className="p-4">
                  <input
                    type="text"
                    value={tw.phonetic}
                    onChange={(e) => handleEditInlineField(tw.id, "phonetic", e.target.value)}
                    placeholder="/.../"
                    className="w-full bg-transparent font-mono text-slate-500 text-xs focus:bg-white focus:outline focus:outline-indigo-100 rounded px-1.5 py-1"
                    id={`field-phonetic-${tw.id}`}
                  />
                </td>
                <td className="p-4">
                  <input
                    type="text"
                    value={tw.translation}
                    onChange={(e) => handleEditInlineField(tw.id, "translation", e.target.value)}
                    placeholder="请输入词义..."
                    className="w-full bg-transparent text-slate-700 text-xs focus:bg-white focus:outline focus:outline-indigo-100 rounded px-1.5 py-1"
                    id={`field-trans-${tw.id}`}
                  />
                </td>
                <td className="p-4 flex flex-col gap-1">
                  <input
                    type="text"
                    value={tw.sentence}
                    onChange={(e) => handleEditInlineField(tw.id, "sentence", e.target.value)}
                    placeholder="AI 待填充例句..."
                    className="w-full bg-transparent text-slate-600 text-xs font-serif focus:bg-white focus:outline focus:outline-indigo-100 rounded px-1.5 py-1"
                    id={`field-sent-${tw.id}`}
                  />
                  <input
                    type="text"
                    value={tw.sentenceTranslation}
                    onChange={(e) => handleEditInlineField(tw.id, "sentenceTranslation", e.target.value)}
                    placeholder="AI 待填充例句翻译..."
                    className="w-full bg-transparent text-slate-400 text-xs focus:bg-white focus:outline focus:outline-indigo-100 rounded px-1.5 py-1"
                    id={`field-senttrans-${tw.id}`}
                  />
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleDeleteTemp(tw.id)}
                    className="p-1 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors text-xs"
                    id={`delete-row-${tw.id}`}
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
            {tempWords.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400 text-sm">
                  列表空空如也，请在上方输入单词，或返回重新导入！
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Button Row */}
      <div className="flex gap-4 justify-end border-t border-slate-100 pt-6">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-5 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors rounded-xl font-medium text-sm cursor-pointer"
          id="btn-batch-cancel"
        >
          取消
        </button>
        <button
          onClick={handleSaveList}
          disabled={loading}
          className="px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 transition-all rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-slate-200 cursor-pointer"
          id="btn-batch-save"
        >
          <Save className="w-4 h-4" />
          保存至我的单词书 (Save Book)
        </button>
      </div>
    </div>
  );
}
