
export interface Card {
  id: string;
  word: string;
  translation: string;
  type: 'Noun' | 'Verb' | 'Adjective' | 'Adverb' | 'Phrase';
  sample_sentence: string; // Example in native/source language for context
  correct_sentence?: string; // Correct sentence in target language
  difficulty: 'New' | 'Learning' | 'Review' | 'Mastered';
}

export interface Deck {
  id: string;
  title: string;
  language: string;
  progress: number;
  gradient: string;
  cards: Card[];
  averageRating?: number;
  cardsStudied?: number;
  is_public?: boolean;
  created_by?: string;
  target_lang?: string;
}

export type AppView = 'Dashboard' | 'Study' | 'Explore' | 'Profile';

export interface AnalysisResult {
  isCorrect: boolean;
  correction: string;
  explanation: string;
  rating: number; // 1-5 with 0.5 increments
}

// Database Types (Supabase)
export interface User {
  id: string;
  username: string;
  email?: string;
  is_pro: boolean;
  streak_days: number;
  total_words_learned?: number; // Cumulative count, never decreases
  avatar_url?: string;
  bio?: string;
  native_lang?: string;
  target_lang?: string;
  proficiency_level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  onboarding_complete?: boolean;
  created_at?: string;
}

export interface DBDeck {
  id: string;
  created_by: string;
  title: string;
  source_lang: string;
  target_lang: string;
  is_public: boolean;
  is_ai_generated?: boolean;
  cover_gradient: string;
  created_at?: string;
}

export interface DBCard {
  id: string;
  deck_id: string;
  word: string;
  translation: string;
  type: string;
  sample_sentence: string;
  ai_context?: string;
  created_at?: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  card_id: string;
  box: number; // Leitner box (1-5)
  next_review: string; // ISO date string
  last_quality: number; // 0-5 rating
  created_at?: string;
}
