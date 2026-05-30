import React, { useState, useRef } from "react";
import { Upload, Image, FileText, Sparkles, Loader2, AlertCircle, Plus, Clipboard } from "lucide-react";

interface WordImporterProps {
  onWordsImported: (words: string[]) => void;
  onCancel: () => void;
}

export default function WordImporter({ onWordsImported, onCancel }: WordImporterProps) {
  const [activeTab, setActiveTab] = useState<"image" | "file" | "paste">("image");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorWord, setErrorWord] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Strip the data:image/*;base64, prefix
        const base64Data = base64String.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handler: Image Upload OCR Extraction
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorWord("请上传图片文件（PNG, JPEG, WebP等）");
      return;
    }

    setLoading(true);
    setErrorWord(null);

    try {
      const base64 = await fileToBase64(file);
      
      const response = await fetch("/api/extract-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "识别图片失败");
      }

      const data = await response.json();
      if (!data.words || data.words.length === 0) {
        throw new Error("未能从图片中提取到清晰的英语单词。请确保图片字迹清晰，且包含英文单词。");
      }

      onWordsImported(data.words);
    } catch (err: any) {
      console.error(err);
      setErrorWord(err.message || "由于网络故障或服务配置问题，极速单词识别失败。");
    } finally {
      setLoading(false);
    }
  };

  // Handler: Text File Imports
  const handleFileImport = async (file: File) => {
    const isTxt = file.name.endsWith(".txt") || file.name.endsWith(".csv");
    if (!isTxt) {
      setErrorWord("请上传 .txt 或 .csv 文件。");
      return;
    }

    setLoading(true);
    setErrorWord(null);

    try {
      const text = await file.text();
      // Match English letter sequences
      const wordsMatched = text.match(/[a-zA-Z\s\-']+/g) || [];
      const cleanedWords = wordsMatched
        .map((w) => w.trim())
        .filter((w) => w.length > 1 && !w.includes("\n") && !w.includes("\r"))
        .filter((w) => /^[a-zA-Z\s\-']+$/.test(w));

      // Separate words that might be comma-separated or space-separated
      const finalWords: string[] = [];
      cleanedWords.forEach(chunk => {
        const parts = chunk.split(/[\s,]+/);
        parts.forEach(p => {
          const pt = p.trim().toLowerCase();
          if (pt.length > 1 && /^[a-z]+$/.test(pt)) {
            finalWords.push(pt);
          }
        });
      });

      const uniqueWords = Array.from(new Set<string>(finalWords));
      if (uniqueWords.length === 0) {
        throw new Error("该文本文件中未提取到符合格式的英语单词。");
      }

      onWordsImported(uniqueWords);
    } catch (err: any) {
      setErrorWord(err.message || "读取文本文件失败");
    } finally {
      setLoading(false);
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (activeTab === "image") {
        handleImageUpload(file);
      } else if (activeTab === "file") {
        handleFileImport(file);
      }
    }
  };

  const handleManualSubmit = () => {
    if (!manualText.trim()) return;
    // Split by comma, newline, semi-colon or spaces
    const items = manualText
      .split(/[\s,;\n、\r]+/)
      .map((w) => w.trim().toLowerCase().replace(/[^a-z]/g, ""))
      .filter((w) => w.length > 1);

    const uniqueWords = Array.from(new Set<string>(items));
    if (uniqueWords.length === 0) {
      setErrorWord("请输入有效的英文单词，单词间用空格、逗号或换行分隔。");
      return;
    }

    onWordsImported(uniqueWords);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-w-2xl mx-auto my-6" id="word-importer">
      {/* Header Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        <button
          onClick={() => { setActiveTab("image"); setErrorWord(null); }}
          className={`flex-1 py-4 flex items-center justify-center gap-2 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "image"
              ? "border-indigo-600 text-indigo-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
          id="tab-btn-image"
        >
          <Image className="w-4 h-4" />
          拍照/图片识别 (AI OCR)
        </button>
        <button
          onClick={() => { setActiveTab("file"); setErrorWord(null); }}
          className={`flex-1 py-4 flex items-center justify-center gap-2 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "file"
              ? "border-indigo-600 text-indigo-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
          id="tab-btn-file"
        >
          <FileText className="w-4 h-4" />
          导入文件 (TXT/CSV)
        </button>
        <button
          onClick={() => { setActiveTab("paste"); setErrorWord(null); }}
          className={`flex-1 py-4 flex items-center justify-center gap-2 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "paste"
              ? "border-indigo-600 text-indigo-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
          id="tab-btn-paste"
        >
          <Clipboard className="w-4 h-4" />
          快捷粘贴导入
        </button>
      </div>

      <div className="p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center" id="importer-loading">
            <div className="relative mb-6">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-bounce" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              {activeTab === "image" ? "Gemini 正在帮您识别图片中的单词..." : "正在处理文件中..."}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              AI 正在仔细识别每一个字母并整理成可默写的单词列表，通常需要耗时数秒。
            </p>
            {activeTab === "image" && (
              <div className="mt-4 w-48 h-1 bg-slate-100 rounded-full overflow-hidden relative">
                <div className="absolute right-full bottom-0 top-0 bg-indigo-600 rounded-full animate-[shimmer_1.5s_infinite] w-full" style={{ animationTimingFunction: "ease-in-out" }}></div>
              </div>
            )}
          </div>
        ) : (
          <>
            {errorWord && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-3 text-sm animate-fade-in" id="importer-error-tip">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-800">导入提示</p>
                  <p>{errorWord}</p>
                </div>
              </div>
            )}

            {/* Drop Zone for Image or File */}
            {(activeTab === "image" || activeTab === "file") && (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50/50 scale-[0.99]"
                    : "border-slate-200 hover:border-slate-400 hover:bg-slate-50/30"
                }`}
                onClick={() => fileInputRef.current?.click()}
                id="importer-drop-zone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={activeTab === "image" ? "image/*" : ".txt,.csv"}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      if (activeTab === "image") {
                        handleImageUpload(e.target.files[0]);
                      } else {
                        handleFileImport(e.target.files[0]);
                      }
                    }
                  }}
                />

                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400 group-hover:text-slate-600 transition-colors mb-4">
                  {activeTab === "image" ? (
                    <Upload className="w-8 h-8 text-indigo-500" />
                  ) : (
                    <FileText className="w-8 h-8 text-amber-500" />
                  )}
                </div>

                <h4 className="text-base font-semibold text-slate-800 mb-1">
                  {activeTab === "image" ? "拖放单词图片到这里，或点击上传" : "拖放文本文件 (.txt/.csv) 到这里，或点击上传"}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mb-6">
                  {activeTab === "image"
                    ? "支持印刷体、手写清晰字迹的单词课表、书本内页或单词卡片图片"
                    : "文本文件会被自动拆分成一个一个独立的英文单词"}
                </p>

                <button
                  type="button"
                  className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-medium text-sm hover:bg-slate-700 transition-all shadow-sm"
                  id="browse-files-btn"
                >
                  浏览本地文件
                </button>
              </div>
            )}

            {/* Paste Tab */}
            {activeTab === "paste" && (
              <div className="flex flex-col gap-4 animate-fade-in" id="paste-section">
                <label className="text-sm font-semibold text-slate-700">请粘贴您的单词列表：</label>
                <textarea
                  className="w-full h-44 p-4 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none placeholder:text-slate-400"
                  placeholder="apple, banana, challenge, computer...&#13;可以使用空格、逗号、分号或换行进行分隔。"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  id="paste-textarea"
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualText.trim()}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 hover:shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-100/50"
                  id="paste-confirm-btn"
                >
                  <Plus className="w-4 h-4" />
                  立即导入这批单词
                </button>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end mt-8 border-t border-slate-100 pt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
            id="cancel-import-btn"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
