
import { Deck } from './types';

export const INITIAL_DECKS: Deck[] = [
  {
    id: '1',
    title: 'Business Spanish',
    language: 'Spanish',
    progress: 65,
    gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    cards: [
      {
        id: 'c1',
        word: 'Presupuesto',
        translation: 'Budget',
        type: 'Noun',
        sample_sentence: 'El presupuesto para el proyecto es limitado.',
        difficulty: 'Learning'
      },
      {
        id: 'c2',
        word: 'Negociación',
        translation: 'Negotiation',
        type: 'Noun',
        sample_sentence: 'La negociación duró varias horas.',
        difficulty: 'Review'
      }
    ]
  },
  {
    id: '2',
    title: 'French A1 Basics',
    language: 'French',
    progress: 30,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    cards: [
      {
        id: 'c3',
        word: 'Bonjour',
        translation: 'Hello',
        type: 'Phrase',
        sample_sentence: 'Bonjour, comment allez-vous?',
        difficulty: 'Mastered'
      }
    ]
  },
  {
    id: '3',
    title: 'Japanese Kanji',
    language: 'Japanese',
    progress: 12,
    gradient: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
    cards: []
  }
];

export const COLORS = {
  learning: '#3b82f6',
  review: '#a855f7',
  difficult: '#f59e0b',
  mastered: '#10b981',
  charcoal: '#1a1a1a',
  offWhite: '#ededed'
};
