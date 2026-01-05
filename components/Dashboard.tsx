
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, TrendingUp, CheckCircle2, Flame, Globe, Plus, Loader2 } from 'lucide-react';
import { Deck } from '../types';
import HealthRings from './HealthRings';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../services/i18n';
import { generateDeck } from '../services/geminiService';
import { deckService } from '../services/deckService';
import { cardService } from '../services/cardService';

interface DashboardProps {
  decks: Deck[];
  onStartDeck: (deck: Deck) => void;
  onAddDeck: (deck: Deck) => void;
  isLoading?: boolean;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', tr: 'Turkish', de: 'German', ru: 'Russian',
  es: 'Spanish', fr: 'French', it: 'Italian', pt: 'Portuguese'
};

// Get suggested topics based on proficiency level
const getLevelTopics = (level: string) => {
  const topics: Record<string, Array<{ emoji: string; name: string; cards: number }>> = {
    'A1': [
      { emoji: '👋', name: 'Greetings', cards: 10 },
      { emoji: '🔢', name: 'Numbers', cards: 10 },
      { emoji: '🎨', name: 'Colors', cards: 10 },
      { emoji: '👨‍👩‍👧', name: 'Family', cards: 10 },
    ],
    'A2': [
      { emoji: '🍎', name: 'Food & Drinks', cards: 10 },
      { emoji: '🏠', name: 'Home & Rooms', cards: 10 },
      { emoji: '📅', name: 'Daily Routine', cards: 10 },
      { emoji: '🛍️', name: 'Shopping', cards: 10 },
    ],
    'B1': [
      { emoji: '✈️', name: 'Travel', cards: 10 },
      { emoji: '💼', name: 'Work & Career', cards: 10 },
      { emoji: '🏥', name: 'Health', cards: 10 },
      { emoji: '🎭', name: 'Entertainment', cards: 10 },
    ],
    'B2': [
      { emoji: '📰', name: 'News & Media', cards: 10 },
      { emoji: '🌍', name: 'Environment', cards: 10 },
      { emoji: '💰', name: 'Finance', cards: 10 },
      { emoji: '⚖️', name: 'Society & Law', cards: 10 },
    ],
    'C1': [
      { emoji: '🔬', name: 'Science', cards: 10 },
      { emoji: '🏛️', name: 'Politics', cards: 10 },
      { emoji: '📊', name: 'Business', cards: 10 },
      { emoji: '🎓', name: 'Academic', cards: 10 },
    ],
    'C2': [
      { emoji: '📜', name: 'Literature', cards: 10 },
      { emoji: '🧠', name: 'Philosophy', cards: 10 },
      { emoji: '💬', name: 'Idioms', cards: 10 },
      { emoji: '✨', name: 'Rare Words', cards: 10 },
    ],
  };
  return topics[level] || topics['B1'];
};

// Map interest IDs to display format
const INTEREST_MAP: Record<string, { emoji: string; name: string }> = {
  'travel': { emoji: '✈️', name: 'Travel' },
  'food': { emoji: '🍕', name: 'Food & Cooking' },
  'tech': { emoji: '💻', name: 'Technology' },
  'sports': { emoji: '⚽', name: 'Sports' },
  'music': { emoji: '🎵', name: 'Music' },
  'movies': { emoji: '🎬', name: 'Movies & TV' },
  'business': { emoji: '💼', name: 'Business' },
  'science': { emoji: '🔬', name: 'Science' },
  'art': { emoji: '🎨', name: 'Art & Design' },
  'fashion': { emoji: '👗', name: 'Fashion' },
  'gaming': { emoji: '🎮', name: 'Gaming' },
  'health': { emoji: '🏥', name: 'Health & Fitness' },
  'nature': { emoji: '🌿', name: 'Nature' },
  'books': { emoji: '📚', name: 'Books & Reading' },
  'social': { emoji: '💬', name: 'Social & Culture' },
};

// Get topics from user interests
const getInterestTopics = (interests: string[] | null | undefined) => {
  if (!interests || interests.length === 0) return null;

  return interests.map(id => ({
    ...INTEREST_MAP[id],
    cards: 10
  })).filter(t => t.emoji); // Filter out any invalid interest IDs
};

const Dashboard: React.FC<DashboardProps> = ({ decks, onStartDeck, onAddDeck, isLoading = false }) => {
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  const targetLang = profile?.target_lang ? LANGUAGE_NAMES[profile.target_lang] || profile.target_lang : 'Language';
  const level = profile?.proficiency_level || 'B1';
  const [generatingDeck, setGeneratingDeck] = useState<string | null>(null);

  const handleAddStarterDeck = async (topic: { emoji: string; name: string }) => {
    if (!user || !profile) return;

    setGeneratingDeck(topic.name);
    try {
      // Generate cards with AI
      const generatedCards = await generateDeck(
        topic.name,
        profile.target_lang || 'en',
        profile.native_lang || 'en',
        profile.proficiency_level || 'B1'
      );

      // Create deck in database
      const gradient = `linear-gradient(135deg, ${getRandomColor()}, ${getRandomColor()})`;
      const newDeck = await deckService.createDeck({
        created_by: user.id,
        title: `${topic.emoji} ${topic.name} (${level})`,
        source_lang: profile.native_lang || 'en',
        target_lang: profile.target_lang || 'en',
        is_public: false,
        cover_gradient: gradient,
      });

      // Save cards
      const cardsToInsert = generatedCards.map((c: any) => ({
        deck_id: newDeck.id,
        word: c.word,
        translation: c.translation,
        type: c.type,
        sample_sentence: c.sample_sentence,
        ai_context: c.correct_sentence,
      }));
      await cardService.createCards(cardsToInsert);

      // Add to local state
      onAddDeck({
        id: newDeck.id,
        title: newDeck.title,
        language: newDeck.target_lang,
        progress: 0,
        gradient: newDeck.cover_gradient,
        cards: generatedCards.map((c: any, i: number) => ({
          id: `temp-${i}`,
          word: c.word,
          translation: c.translation,
          type: c.type,
          sample_sentence: c.sample_sentence,
          correct_sentence: c.correct_sentence,
          difficulty: 'New' as const
        }))
      });

      alert(`"${topic.name}" deck added to your collection!`);
    } catch (error) {
      console.error('Error creating starter deck:', error);
      alert('Failed to create deck. Please try again.');
    } finally {
      setGeneratingDeck(null);
    }
  };

  const getRandomColor = () => {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div className="space-y-12">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[#1a1a1a]">{t('dashboard.title')}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold">
              <Globe size={12} />
              {targetLang} • {level}
            </span>
            <p className="text-gray-500 text-sm font-medium tracking-wide">{t('dashboard.journey')}</p>
          </div>
        </div>

        {/* Health Rings Container */}
        <div className="glass p-6 rounded-[32px] w-full md:w-auto min-w-[300px] flex items-center gap-6 shadow-sm overflow-hidden">
          <div className="flex-shrink-0">
            <HealthRings />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Words Learned</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Accuracy</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Streak</span>
            </div>
          </div>
        </div>
      </section>

      {/* Starter Decks - Add to Collection */}
      {profile?.proficiency_level && (
        <section className="glass p-8 rounded-[40px] bg-gradient-to-br from-blue-500/5 to-purple-500/5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold mb-1">
                {profile?.interests && profile.interests.length > 0
                  ? t('dashboard.your_interests')
                  : `${level} ${t('dashboard.starter_decks')}`}
              </h2>
              <p className="text-gray-500 text-sm">
                {t('dashboard.add_premade')}
              </p>
            </div>
          </div>

          {/* Starter Deck Cards - Use interests if available, otherwise level topics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(getInterestTopics(profile?.interests) || getLevelTopics(level)).map((topic, i) => {
              const alreadyHas = decks.some(d => d.title.includes(topic.name));
              return (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  className={`p-4 rounded-2xl border-2 transition-all ${alreadyHas
                    ? 'bg-green-50 border-green-200 opacity-60'
                    : 'bg-white/50 border-white/60 hover:border-blue-400 hover:shadow-lg cursor-pointer'
                    }`}
                >
                  <span className="text-3xl mb-2 block">{topic.emoji}</span>
                  <h4 className="font-bold text-sm">{topic.name}</h4>
                  <p className="text-xs text-gray-500 mb-3">{topic.cards} {t('dashboard.words')} • {level}</p>

                  {alreadyHas ? (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} />{t('dashboard.added')}
                    </span>
                  ) : generatingDeck === topic.name ? (
                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />{t('dashboard.creating')}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAddStarterDeck(topic)}
                      className="w-full bg-blue-500 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />{t('dashboard.add_deck')}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Ongoing Decks Grid */}
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-6">{t('dashboard.your_decks')}</h2>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm uppercase tracking-widest">{t('dashboard.loading_decks')}</p>
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-12 glass rounded-[32px] p-8">
            <p className="text-gray-600 font-medium mb-2">{t('dashboard.no_decks')}</p>
            <p className="text-gray-400 text-sm">{t('dashboard.no_decks_hint')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map((deck) => (
              <motion.div
                key={deck.id}
                whileHover={{ y: -4 }}
                className="group relative h-48 rounded-[32px] overflow-hidden cursor-pointer shadow-lg"
                onClick={() => onStartDeck(deck)}
              >
                {/* Abstract Gradient Background */}
                <div
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
                  style={{ background: deck.gradient }}
                />

                <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />

                <div className="relative h-full p-8 flex flex-col justify-between text-white">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">{deck.language}</span>
                    <h3 className="text-2xl font-bold mt-1 tracking-tight">{deck.title}</h3>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      {/* Progress bar */}
                      <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden mb-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${deck.progress || 0}%` }}
                          className="h-full bg-white"
                        />
                      </div>
                      {/* Stats row */}
                      <div className="flex justify-between items-center text-[10px] text-white/70">
                        <span>{deck.cardsStudied || 0}/{deck.cards?.length || 0} cards</span>
                        {deck.averageRating && deck.averageRating > 0 && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {deck.averageRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={20} fill="white" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Daily Goals */}
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-6">Daily Quests</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass p-6 rounded-[24px] flex items-center gap-4 border-white/40">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold">Review 20 cards</p>
              <p className="text-[11px] text-gray-400">12 / 20 COMPLETED</p>
            </div>
          </div>
          <div className="glass p-6 rounded-[24px] flex items-center gap-4 border-white/40">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold">90% Accuracy Rate</p>
              <p className="text-[11px] text-gray-400">CURRENT: 88%</p>
            </div>
          </div>
          <div className="glass p-6 rounded-[24px] flex items-center gap-4 border-white/40">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Flame size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold">Maintain Streak</p>
              <p className="text-[11px] text-gray-400">DAY 14 OF 20</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
