import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export type NoteStyle = 'balanced' | 'formulas' | 'visual' | 'simple';

export interface TopperNotes {
  title: string;
  content: string; // Markdown
  imagePrompt: string;
}

export async function generateNotes(topic: string, grade: string, style: NoteStyle = 'balanced'): Promise<TopperNotes> {
  const model = "gemini-3-flash-preview";
  
  const styleInstructions = {
    balanced: "Provide a perfect balance of explanations, examples, and formulas.",
    formulas: "Focus heavily on formulas, mathematical derivations, definitions, and important facts. Use tables where possible.",
    visual: "Focus on creating highly descriptive content that is easy to visualize. Keep paragraphs extremely short and focus on structural breakdowns.",
    simple: "Use very simple language, analogies, and easy-to-understand examples. Avoid overly complex jargon unless necessary for the exam."
  };

  const systemInstruction = `
    You are an expert Class ${grade} educator who creates "Topper-style" study notes. 
    Your notes are famous for being exam-focused, neat, and simple to remember.
    
    Current Style Preference: ${styleInstructions[style]}

    Structure of the notes:
    1. Clear Headings (Use # for title, ## for sections).
    2. Short and Smart Explanations (Bullet points, concise sentences).
    3. Important Formulas or Facts (Highlight these using bold or blockquotes).
    4. Easy Examples (Real-world or simple scenarios).
    5. Tables: Use markdown tables for comparisons or listing differences (very common in school exams).
    6. Quick Revision Points at the end (Summary list).
    
    Format: Return the output as a valid JSON object with the following keys:
    - title: The topic title.
    - content: The full notes in high-quality Markdown.
    - imagePrompt: A detailed prompt for gemini-2.5-flash-image to generate a helpful diagram or scientific illustration for this topic. Be specific about labels and details.
    
    Voice: Professional, encouraging, and clear. 
    Focus on school curriculum (Math, Science, Social Science) for Class ${grade}.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `Generate topper-style notes for the topic: "${topic}" for Class ${grade}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  const text = response.text || "{}";
  try {
    return JSON.parse(text) as TopperNotes;
  } catch (e) {
    console.error("Failed to parse AI response", text);
    throw new Error("Failed to generate structured notes.");
  }
}

export async function generateDiagram(prompt: string, grade: string): Promise<string | null> {
  // Using gemini-2.5-flash-image for runtime image generation
  const model = "gemini-2.5-flash-image";
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ text: `Create a clean, scientific or educational diagram for: ${prompt}. The diagram should be neat, labelled, and suitable for Class ${grade} students.` }],
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image generation failed", e);
  }
  return null;
}

export async function generateAudioExplanation(notes: string, grade: string): Promise<string | null> {
  const model = 'gemini-3.1-flash-tts-preview';
  
  try {
    const prompt = `Explain these study notes in a clear, encouraging, teacher-like voice for a Class ${grade} student. 
    Focus on explaining the core concepts simply and highlighting why they are important for exams.
    Notes: ${notes.substring(0, 3000)}`; // Truncate just in case

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Warm/Encouraging
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
  } catch (e) {
    console.error("Audio generation failed", e);
  }
  return null;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
  explanation: string;
}

export async function generateQuiz(notes: string, grade: string): Promise<QuizQuestion[]> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are an expert exam setter. Create a short, challenging, and conceptual multiple-choice quiz (5 questions) based on the provided notes for a Class ${grade} student.
    
    Format: Return the output as a valid JSON array of objects with the following keys:
    - question: The question text.
    - options: An array of 4 strings (options).
    - correctAnswer: The index (0-3) of the correct option.
    - explanation: A short, clear explanation of why that option is correct.
    
    Ensure questions test understanding, not just rote memorization.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `Generate a 5-question MCQ quiz for these notes: ${notes.substring(0, 4000)}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  const text = response.text || "[]";
  try {
    return JSON.parse(text) as QuizQuestion[];
  } catch (e) {
    console.error("Failed to parse quiz response", text);
    throw new Error("Failed to generate quiz questions.");
  }
}
