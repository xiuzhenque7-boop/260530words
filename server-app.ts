import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Support larger body size for image uploads/base64 strings
app.use(express.json({ limit: "15mb" }));

// Helper to check if a key looks like a DeepSeek or OpenAI key (e.g. starts with sk-)
function isDeepSeekOrOpenAIKey(key?: string): boolean {
  if (!key) return false;
  const k = key.trim();
  return k.startsWith("sk-") || k.includes("deepseek");
}

// Get appropriate API key and provider info
function getModelProvider() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  if (deepseekKey) {
    return {
      provider: "deepseek",
      apiKey: deepseekKey.trim(),
    };
  }

  if (geminiKey) {
    if (isDeepSeekOrOpenAIKey(geminiKey)) {
      return {
        provider: "deepseek",
        apiKey: geminiKey.trim(),
      };
    }
    return {
      provider: "gemini",
      apiKey: geminiKey.trim(),
    };
  }

  return {
    provider: null,
    apiKey: null,
  };
}

// Lazy initialization helper for Gemini to avoid ESM import issues on startup in CommonJS/Vercel
let aiInstance: any = null;
let geminiType: any = null;

async function initGemini(apiKey: string) {
  if (!aiInstance) {
    const sdk = await import("@google/genai");
    aiInstance = new sdk.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    geminiType = sdk.Type;
  }
  return { ai: aiInstance, Type: geminiType };
}

// DeepSeek API helper using system-native fetch
async function callDeepSeekAPI(prompt: string, requireJson: boolean, apiKey: string) {
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";
  
  const body: any = {
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: requireJson
          ? "You are a helpful language tutoring assistant. You must respond with a clean JSON object containing the requested data. Do not wrap the JSON output in markdown ```json or ``` blocks. It must be a raw parsed JSON string."
          : "You are a helpful language tutoring assistant."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.2
  };

  if (requireJson) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API returned error status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return text.trim();
}

// API Endpoints
app.get("/api/health", (req, res) => {
  const { provider } = getModelProvider();
  res.json({
    status: "ok",
    hasApiKey: !!provider,
    provider: provider || "none",
  });
});

// Extract English words from base64 image (Only works on Gemini vision-capable API)
app.post("/api/extract-words", async (req, res) => {
  const { image, mimeType } = req.body;

  if (!image || !mimeType) {
    return res.status(400).json({ error: "Missing required fields 'image' and 'mimeType'." });
  }

  const { provider, apiKey } = getModelProvider();

  if (!provider || !apiKey) {
    return res.status(400).json({ error: "请配置 GEMINI_API_KEY 以开启拍照/图片智能提取单词功能。" });
  }

  if (provider === "deepseek") {
    return res.status(400).json({ 
      error: "检测到您正在使用 DeepSeek (一个极佳的文本模型)。然而 DeepSeek 暂时没有直接的视觉多模态接口处理图片。请通过 [导入 TXT 文件]、[手动输入] 或者配置 `GEMINI_API_KEY` 视觉大模型以启用拍照识别。" 
    });
  }

  try {
    const { ai, Type } = await initGemini(apiKey);

    const imagePart = {
      inlineData: {
        mimeType,
        data: image,
      },
    };

    const promptPart = {
      text: "Please look at this image and extract all written or printed English words. Find any clear vocabulary list, textbook words, handwriting, or captions. Ignore digits or standalone punctuation. Correct spelling mistakes or obvious typos if those elements represent normal dictionary words. Avoid very short random noise (e.g. lone letters). Return purely a flat JSON list of these words.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, promptPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    const extractedText = response.text || "[]";
    let words: string[] = [];
    try {
      words = JSON.parse(extractedText);
    } catch (e) {
      console.error("Failed to parse Gemini response directly, fallback parse:", extractedText);
      const match = extractedText.match(/\[.*\]/s);
      if (match) {
        words = JSON.parse(match[0]);
      }
    }

    // Filter and clean words to containing only word characters, spaces, or hyphens
    words = words
      .map((w) => w.trim())
      .filter((w) => w && /^[a-zA-Z\s\-']+$/.test(w));

    res.json({ words: Array.from(new Set(words)) }); // De-duplicate
  } catch (err: any) {
    console.error("Error extracting words:", err);
    res.status(500).json({
      error: err.message || "An error occurred while extracting words from the image.",
    });
  }
});

// Generate example sentences, translation, and IPA phonetics for a list of words
app.post("/api/generate-details", async (req, res) => {
  const { words } = req.body;

  if (!words || !Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ error: "Required array parameter 'words' is missing or empty." });
  }

  const { provider, apiKey } = getModelProvider();

  if (!provider || !apiKey) {
    return res.status(400).json({ error: "Missing API Key configuration. Please configure GEMINI_API_KEY or DEEPSEEK_API_KEY." });
  }

  try {
    if (provider === "deepseek") {
      const prompt = `You are a professional dictionary assistant.
Analyze the following English words: ${words.join(", ")}.

For each word, return a JSON object with these exact keys:
- "word": (string) the word itself
- "translation": (string) precise Chinese translation
- "phonetic": (string) standard IPA phonetics, e.g., /'æpl/
- "sentence": (string) a short illustrative English sentence using the word, helpful for spelling dictation/practice
- "sentenceTranslation": (string) accurate Chinese translation of the illustrative sentence

Provide the output as a clean JSON object containing a "details" key which maps to an array of objects representing these words.
Example absolute response:
{
  "details": [
    {
      "word": "apple",
      "translation": "苹果",
      "phonetic": "/'æpl/",
      "sentence": "He ate a fresh red apple.",
      "sentenceTranslation": "他吃了一个新鲜的红苹果。"
    }
  ]
}
Ensure accurate spelling and valid JSON structure.`;

      const textOutput = await callDeepSeekAPI(prompt, true, apiKey);
      let detailedWords = [];
      try {
        const parsed = JSON.parse(textOutput);
        if (parsed.details && Array.isArray(parsed.details)) {
          detailedWords = parsed.details;
        } else if (Array.isArray(parsed)) {
          detailedWords = parsed;
        } else {
          // Fallback if structured differently
          detailedWords = Object.values(parsed).filter((item: any) => item && typeof item === 'object' && item.word);
        }
      } catch (e) {
        console.error("Failed to parse DeepSeek response directly, trying fallback regex match:", textOutput);
        const match = textOutput.match(/\[\s*\{.*\}\s*\]/s);
        if (match) {
          detailedWords = JSON.parse(match[0]);
        } else {
          throw new Error("模型返回了不符合标准 JSON 格式的响应：" + textOutput);
        }
      }
      return res.json({ details: detailedWords });
    }

    // Default: Gemini API Provider
    const { ai, Type } = await initGemini(apiKey);

    const prompt = `Translate the following English words, generate their phonetic transcriptions using standard international IPA, provide a simple English example sentence illustrating the usage of each word (make the sentences helpful for dictation/practice, keeping them moderately short), and translate each example sentence to Chinese.

The words to analyze are: ${words.join(", ")}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "The list of detailed word breakdown matching the input list",
          items: {
            type: Type.OBJECT,
            properties: {
              word: {
                type: Type.STRING,
                description: "The exact English word",
              },
              translation: {
                type: Type.STRING,
                description: "Chinese translation of the word",
              },
              phonetic: {
                type: Type.STRING,
                description: "Phonetic IPA spelling of the word, surrounded by slashes, e.g. /'æpl/",
              },
              sentence: {
                type: Type.STRING,
                description: "A short, illustrative example sentence in English, containing the word.",
              },
              sentenceTranslation: {
                type: Type.STRING,
                description: "A accurate Chinese translation of the illustration sentence.",
              },
            },
            required: ["word", "translation", "phonetic", "sentence", "sentenceTranslation"],
          },
        },
      },
    });

    const textOutput = response.text || "[]";
    let detailedWords = [];
    try {
      detailedWords = JSON.parse(textOutput);
    } catch (e) {
      console.error("Failed to parse word details directly:", textOutput);
      const match = textOutput.match(/\[.*\]/s);
      if (match) {
        detailedWords = JSON.parse(match[0]);
      }
    }

    res.json({ details: detailedWords });
  } catch (err: any) {
    console.error("Error generating word details:", err);
    res.status(500).json({
      error: err.message || "An error occurred while generating word definitions.",
    });
  }
});

// Global Express error handler mapping exceptions to JSON responses
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled API error caught by Express middleware:", err);
  res.status(500).json({
    error: "Internal API Route Error",
    message: err?.message || String(err),
    stack: err?.stack || null
  });
});

export default app;
