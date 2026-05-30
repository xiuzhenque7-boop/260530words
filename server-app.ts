import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Support larger body size for image uploads/base64 strings
app.use(express.json({ limit: "15mb" }));

// Lazy initialization helper for Gemini
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is required. Please set it in Vercel Environment Variables or Settings > Secrets."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API Endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Extract English words from base64 image
app.post("/api/extract-words", async (req, res) => {
  const { image, mimeType } = req.body;

  if (!image || !mimeType) {
    return res.status(400).json({ error: "Missing required fields 'image' and 'mimeType'." });
  }

  try {
    const ai = getGeminiClient();

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

  try {
    const ai = getGeminiClient();

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

export default app;
