
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Initialized with named parameter and direct process.env.API_KEY reference
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSentence = async (
  targetWord: string,
  userSentence: string,
  correctSentence: string,
  nativeLanguage: string = 'English',
  targetLanguage: string = 'English'
): Promise<AnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Analyze this language learning sentence completion exercise:
        
        Target Word to Use: "${targetWord}"
        Correct Example Sentence: "${correctSentence}"
        User's Sentence: "${userSentence}"
        Target Language Being Learned: ${targetLanguage}
        User's Native Language: ${nativeLanguage}
        
        IMPORTANT: Write ALL your feedback and explanation in ${nativeLanguage}!
        The user speaks ${nativeLanguage} natively and is learning ${targetLanguage}.
        
        Your task:
        1. Compare the user's sentence to the correct example
        2. Check if the user used "${targetWord}" correctly in context
        3. Focus primarily on MEANING and VOCABULARY usage
        4. Provide SPECIFIC feedback on what could be improved
        5. Give a STAR RATING from 1 to 5 (with 0.5 increments like 2.5, 3.5, 4.5)
        
        RATING GUIDE (BE ENCOURAGING - focus on communication success):
        - 5.0: Perfect or near-perfect, meaning is clear (minor punctuation differences are OK)
        - 4.5: Excellent, small issues that don't affect understanding
        - 4.0: Very good, minor grammatical issues but meaning is clear
        - 3.5: Good attempt, some mistakes but word used correctly
        - 3.0: Acceptable, message understandable despite errors
        - 2.5: Below average, meaning somewhat unclear
        - 2.0: Poor, significant issues affecting comprehension
        - 1.5: Very poor, barely understandable
        - 1.0: Completely wrong or word not used
        
        IMPORTANT RATING RULES:
        - Punctuation errors (periods, commas, capitalization) should have MINIMAL impact on rating
        - If the user's sentence correctly uses the target word and conveys the right meaning, give at least 4.0
        - Focus on: correct word usage > grammar structure > meaning preservation
        - Be encouraging! The goal is to motivate learning, not discourage
        
        Be constructive and educational. If the sentence is correct in meaning, praise it!
        If there are mistakes, explain clearly IN ${nativeLanguage}:
        - What the user wrote
        - What they could improve
        - Why (grammar rule, word choice, etc.) - but be kind about punctuation
        
        Remember: The "explanation" field MUST be written entirely in ${nativeLanguage}!
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            correction: { type: Type.STRING },
            explanation: { type: Type.STRING },
            rating: { type: Type.NUMBER },
          },
          required: ["isCorrect", "correction", "explanation", "rating"],
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Analysis failed:", error);
    return {
      isCorrect: false,
      correction: correctSentence,
      explanation: "Connectivity issue with the AI agent. Please try again.",
      rating: 0
    };
  }
};

export const generateDeck = async (
  topic: string,
  targetLanguage: string,
  sourceLanguage: string = 'English',
  proficiencyLevel: string = 'B1'
) => {
  const levelDescriptions: Record<string, string> = {
    'A1': 'absolute beginner - basic greetings, simple present tense, common everyday words',
    'A2': 'elementary - simple sentences, past tense, daily activities and routines',
    'B1': 'intermediate - connected sentences, opinions, experiences, future plans',
    'B2': 'upper-intermediate - complex ideas, abstract topics, fluent conversation',
    'C1': 'advanced - nuanced expression, idioms, professional and academic language',
    'C2': 'mastery - sophisticated vocabulary, rare expressions, native-like complexity'
  };

  const levelRequirement = levelDescriptions[proficiencyLevel] || levelDescriptions['B1'];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a vocabulary list for a language learning app. 
      Topic: "${topic}"
      Target Language: "${targetLanguage}" (the language being LEARNED)
      Source Language: "${sourceLanguage}" (the user's NATIVE language)
      Proficiency Level: ${proficiencyLevel} - ${levelRequirement}
      
      IMPORTANT: All vocabulary MUST be appropriate for ${proficiencyLevel} level:
      - Use vocabulary complexity matching the level
      - Sentence structures should match the level (simple for A1/A2, complex for C1/C2)
      - Common words for beginners, advanced/idiomatic expressions for higher levels
      
      Provide exactly 10 diverse words or phrases related to the topic.
      
      CRITICAL REQUIREMENTS:
      - "word": The vocabulary word in ${targetLanguage}
      - "translation": Meaning in ${sourceLanguage}
      - "sample_sentence": Example sentence in ${sourceLanguage} showing how to use the word (for context)
      - "correct_sentence": A proper sentence in ${targetLanguage} using the word (what user should write)
      
      Example for learning English (target) with Turkish (source) native at B1 level:
      {
        "word": "dishwasher",
        "translation": "bulaşık makinesi", 
        "type": "Noun",
        "sample_sentence": "Bulaşık makinesi 2 saattir çalışıyor",
        "correct_sentence": "The dishwasher has been running for 2 hours"
      }
      
      The user will see the word and example in their native language, then write a sentence in the target language.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              translation: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["Noun", "Verb", "Adjective", "Adverb", "Phrase"] },
              sample_sentence: { type: Type.STRING },
              correct_sentence: { type: Type.STRING }
            },
            required: ["word", "translation", "type", "sample_sentence", "correct_sentence"]
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Generation failed:", error);
    throw error;
  }
};
