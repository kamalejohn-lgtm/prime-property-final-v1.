import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

const checkApiKey = () => {
  if (!apiKey || apiKey === "") {
    throw new Error("MISSING_API_KEY: Please set GEMINI_API_KEY in your environment variables.");
  }
};

export const importFromUrl = async (url: string, type: "news" | "chronicle" | "leadership") => {
  try {
    checkApiKey();
    let prompt = "";
    let schema: any = {};

    if (type === "news") {
      prompt = "Extract the title, a short summary, the full content, and a primary image URL from this news article. If any field is missing, provide a reasonable placeholder or leave it empty.";
      schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          content: { type: Type.STRING },
          image_url: { type: Type.STRING },
        },
        required: ["title", "content"]
      };
    } else if (type === "chronicle") {
      prompt = "Extract the name of the commander, the unit they commanded (one of: MHQ, FHQ, SENBAT, NIGCOY, GHANCOY, SENFPU), the years of command (e.g. 2020 - 2022), and a primary image URL of the commander from this page.";
      schema = {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          unit: { type: Type.STRING },
          years: { type: Type.STRING },
          image_url: { type: Type.STRING },
        },
        required: ["name", "unit", "years"]
      };
    } else if (type === "leadership") {
      prompt = "Extract the name of the leader, their title/rank (e.g. Brigadier General), their position (e.g. Force Commander), a short bio, their unit (one of: MHQ, FHQ, SENBAT, NIGCOY, GHANCOY, SENFPU), and a primary image URL from this page.";
      schema = {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          title: { type: Type.STRING },
          position: { type: Type.STRING },
          bio: { type: Type.STRING },
          unit: { type: Type.STRING },
          image_url: { type: Type.STRING },
        },
        required: ["name", "title", "position", "bio"]
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${prompt} URL: ${url}`,
      config: {
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("MISSING_API_KEY")) throw error;
    throw new Error("AI service error. Please check your API key and quota.");
  }
};

export const generateNewsSummary = async (content: string) => {
  try {
    checkApiKey();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following news article in about 2-3 sentences: \n\n${content}`,
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("MISSING_API_KEY")) throw error;
    throw new Error("AI service error. Please check your API key and quota.");
  }
};

export const improveNewsContent = async (content: string) => {
  try {
    checkApiKey();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Improve the following news article for a professional military mission website. Make it formal, clear, and concise: \n\n${content}`,
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("MISSING_API_KEY")) throw error;
    throw new Error("AI service error. Please check your API key and quota.");
  }
};

export const suggestNewsTitle = async (content: string) => {
  try {
    checkApiKey();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest a professional and catchy title for the following news article: \n\n${content}`,
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("MISSING_API_KEY")) throw error;
    throw new Error("AI service error. Please check your API key and quota.");
  }
};

export const chatWithGemini = async (message: string, context: string) => {
  try {
    checkApiKey();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are the ECOMIG Mission AI Assistant. Your goal is to help mission personnel with information about ECOMIG, its mandate, news, and policies. 
      
      Context information (latest news and mission details):
      ${context}
      
      User Question: ${message}`,
      config: {
        systemInstruction: "Be professional, helpful, and concise. Always maintain a military-appropriate tone. If you don't know the answer based on the context, say you're not sure and suggest contacting the PIO (Public Information Office).",
      }
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("MISSING_API_KEY")) throw error;
    throw new Error("AI service error. Please check your API key and quota.");
  }
};
