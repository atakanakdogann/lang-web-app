
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, TrendingUp, CheckCircle2, Flame, Globe, Plus, Loader2, ChevronDown, Check, Sparkles, X, Trash2 } from 'lucide-react';
import { Deck } from '../types';
import HealthRings from './HealthRings';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../services/i18n';
import { generateDeck } from '../services/geminiService';
import { deckService } from '../services/deckService';
import { cardService } from '../services/cardService';
import { profileService } from '../services/profileService';

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

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
];

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const Dashboard: React.FC<DashboardProps> = ({ decks, onStartDeck, onAddDeck, isLoading = false }) => {
  const { profile, user, refreshProfile } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const targetLang = profile?.target_lang ? LANGUAGE_NAMES[profile.target_lang] || profile.target_lang : 'Language';
  const level = profile?.proficiency_level || 'B1';
  const [generatingDeck, setGeneratingDeck] = useState<string | null>(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // AI Deck Creation Modal States
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTargetLang, setAiTargetLang] = useState(profile?.target_lang || '');
  const [aiSourceLang, setAiSourceLang] = useState(profile?.native_lang || 'en');
  const [aiIsPublic, setAiIsPublic] = useState(true); // Default to public
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Manual Deck Creation Modal States
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualTargetLang, setManualTargetLang] = useState(profile?.target_lang || '');
  const [manualSourceLang, setManualSourceLang] = useState(profile?.native_lang || 'en');
  const [manualIsPublic, setManualIsPublic] = useState(true); // Default to public
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const [manualCards, setManualCards] = useState<Array<{
    word: string;
    translation: string;
    type: string;
    sample_sentence: string;
  }>>([{ word: '', translation: '', type: 'Noun', sample_sentence: '' }]);

  const handleAIGenerate = async () => {
    if (!aiTopic || !aiTargetLang || !user) return;
    setIsGeneratingAI(true);
    try {
      const generatedCards = await generateDeck(
        aiTopic,
        aiTargetLang,
        aiSourceLang,
        profile?.proficiency_level || 'B1'
      );

      const gradient = `linear-gradient(135deg, ${getRandomColor()}, ${getRandomColor()})`;
      const newDeck = await deckService.createDeck({
        created_by: user.id,
        title: aiTopic.charAt(0).toUpperCase() + aiTopic.slice(1),
        source_lang: aiSourceLang,
        target_lang: aiTargetLang,
        is_public: aiIsPublic,
        is_ai_generated: true,
        level: profile?.proficiency_level || 'B1',
        cover_gradient: gradient,
      });

      const cardsToInsert = generatedCards.map((c: any) => ({
        deck_id: newDeck.id,
        word: c.word,
        translation: c.translation,
        type: c.type,
        sample_sentence: c.sample_sentence,
        ai_context: c.correct_sentence || null,
      }));

      const createdCards = await cardService.createCards(cardsToInsert);

      const localDeck: Deck = {
        id: newDeck.id,
        title: newDeck.title,
        language: newDeck.target_lang,
        source_lang: aiSourceLang,
        target_lang: newDeck.target_lang,
        level: profile?.proficiency_level || 'B1',
        is_public: aiIsPublic,
        created_by: user.id,
        progress: 0,
        gradient: newDeck.cover_gradient,
        cards: createdCards.map((c: any) => ({
          id: c.id,
          word: c.word,
          translation: c.translation,
          type: c.type,
          sample_sentence: c.sample_sentence,
          correct_sentence: c.ai_context,
          difficulty: 'New' as const
        }))
      };

      onAddDeck(localDeck);
      setIsAIModalOpen(false);
      setAiTopic('');
      setAiIsPublic(true);
      toast.success(t('dashboard.deck_created'), t('dashboard.deck_created_desc'));
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Generation Failed', 'Could not create deck. Please try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const addManualCard = () => {
    setManualCards([...manualCards, { word: '', translation: '', type: 'Noun', sample_sentence: '' }]);
  };

  const removeManualCard = (index: number) => {
    if (manualCards.length > 1) {
      setManualCards(manualCards.filter((_, i) => i !== index));
    }
  };

  const updateManualCard = (index: number, field: string, value: string) => {
    const updated = [...manualCards];
    updated[index] = { ...updated[index], [field]: value };
    setManualCards(updated);
  };

  const handleManualCreate = async () => {
    if (!manualTitle || !manualTargetLang || !user) return;

    const validCards = manualCards.filter(c => c.word && c.translation);
    if (validCards.length === 0) {
      toast.warning('No Cards', 'Please add at least one card with word and translation.');
      return;
    }

    setIsCreatingManual(true);
    try {
      const gradient = `linear-gradient(135deg, ${getRandomColor()}, ${getRandomColor()})`;
      const newDeck = await deckService.createDeck({
        created_by: user.id,
        title: manualTitle,
        source_lang: manualSourceLang,
        target_lang: manualTargetLang,
        is_public: manualIsPublic,
        is_ai_generated: false,
        level: profile?.proficiency_level || 'B1',
        cover_gradient: gradient,
      });

      const cardsToInsert = validCards.map((c) => ({
        deck_id: newDeck.id,
        word: c.word,
        translation: c.translation,
        type: c.type,
        sample_sentence: c.sample_sentence,
        ai_context: null,
      }));

      await cardService.createCards(cardsToInsert);

      // Fetch the actual cards with real IDs from database
      const createdCards = await cardService.getCardsForDeck(newDeck.id);

      const localDeck: Deck = {
        id: newDeck.id,
        title: newDeck.title,
        language: newDeck.target_lang,
        source_lang: manualSourceLang,
        target_lang: newDeck.target_lang,
        level: profile?.proficiency_level || 'B1',
        is_public: manualIsPublic,
        created_by: user.id,
        progress: 0,
        gradient: newDeck.cover_gradient,
        cards: createdCards.map((c) => ({
          id: c.id,
          word: c.word,
          translation: c.translation,
          type: c.type as any,
          sample_sentence: c.sample_sentence,
          difficulty: 'New' as const
        }))
      };

      onAddDeck(localDeck);
      setIsManualModalOpen(false);
      setManualTitle('');
      setManualCards([{ word: '', translation: '', type: 'Noun', sample_sentence: '' }]);
      setManualIsPublic(true);
      toast.success(t('dashboard.deck_created'), t('dashboard.deck_created_desc'));
    } catch (error) {
      console.error('Manual creation error:', error);
      toast.error('Creation Failed', 'Could not create deck. Please try again.');
    } finally {
      setIsCreatingManual(false);
    }
  };

  const handleLanguageChange = async (langCode: string) => {
    if (!user || !profile) return;
    setSavingPrefs(true);
    setShowLangDropdown(false);
    try {
      await profileService.updateLanguageSettings(
        user.id,
        profile.native_lang || 'en',
        langCode,
        profile.proficiency_level || 'B1'
      );
      toast.success(t('dashboard.prefs_saved'), t('dashboard.lang_updated'));
      if (refreshProfile) refreshProfile();
    } catch (error) {
      console.error('Failed to update language:', error);
      toast.error('Error', 'Failed to update language');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleLevelChange = async (newLevel: string) => {
    if (!user || !profile) return;
    setSavingPrefs(true);
    setShowLevelDropdown(false);
    try {
      await profileService.updateLanguageSettings(
        user.id,
        profile.native_lang || 'en',
        profile.target_lang || 'en',
        newLevel
      );
      toast.success(t('dashboard.prefs_saved'), t('dashboard.level_updated'));
      if (refreshProfile) refreshProfile();
    } catch (error) {
      console.error('Failed to update level:', error);
      toast.error('Error', 'Failed to update level');
    } finally {
      setSavingPrefs(false);
    }
  };

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
        title: `${topic.emoji} ${topic.name}`,
        source_lang: profile.native_lang || 'en',
        target_lang: profile.target_lang || 'en',
        is_public: false,
        is_ai_generated: true,
        level: profile.proficiency_level || 'B1',
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

      // Add to local state with level
      onAddDeck({
        id: newDeck.id,
        title: newDeck.title,
        language: newDeck.target_lang,
        source_lang: profile.native_lang || 'en',
        target_lang: newDeck.target_lang,
        level: profile.proficiency_level || 'B1',
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

      toast.success('Deck Created!', `"${topic.name}" deck added to your collection!`);
    } catch (error) {
      console.error('Error creating starter deck:', error);
      toast.error('Failed', 'Could not create deck. Please try again.');
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
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setShowLangDropdown(!showLangDropdown); setShowLevelDropdown(false); }}
                disabled={savingPrefs}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                <Globe size={12} />
                {targetLang}
                <ChevronDown size={12} />
              </button>
              {showLangDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 min-w-[160px]">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${profile?.target_lang === lang.code ? 'text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      {profile?.target_lang === lang.code && <Check size={14} className="ml-auto text-blue-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Level Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setShowLevelDropdown(!showLevelDropdown); setShowLangDropdown(false); }}
                disabled={savingPrefs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-70"
              >
                {level}
                <ChevronDown size={12} />
              </button>
              {showLevelDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 min-w-[80px]">
                  {LEVELS.map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => handleLevelChange(lvl)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${level === lvl ? 'text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                    >
                      {lvl}
                      {level === lvl && <Check size={14} className="text-blue-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
              // Check if deck with same topic AND same target language exists
              const alreadyHas = decks.some(d =>
                d.title.includes(topic.name) && d.target_lang === profile?.target_lang
              );
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
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative h-52 rounded-[28px] overflow-hidden cursor-pointer"
                style={{
                  background: deck.gradient,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 12px 40px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
                }}
                onClick={() => onStartDeck(deck)}
              >
                {/* Overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/30" />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

                <div className="relative h-full p-6 flex flex-col justify-between text-white">
                  {/* Top Section - Badges */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {/* Language Badge */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg">
                        <span className="text-xs">{LANGUAGES.find(l => l.code === deck.source_lang)?.flag || '🌐'}</span>
                        <span className="text-[10px] opacity-60">→</span>
                        <span className="text-xs">{LANGUAGES.find(l => l.code === deck.target_lang)?.flag || '🌐'}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide">{deck.language}</span>
                      </div>
                      {/* Level Badge */}
                      {deck.level && (
                        <div className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg">
                          <span className="text-[10px] font-bold">{deck.level}</span>
                        </div>
                      )}
                    </div>
                    {/* Title */}
                    <h3 className="text-xl font-bold tracking-tight drop-shadow-sm">{deck.title}</h3>
                  </div>

                  {/* Bottom Section - Progress */}
                  <div className="space-y-3">
                    {/* Progress bar */}
                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${deck.progress || 0}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-white rounded-full"
                        style={{ boxShadow: '0 0 8px rgba(255,255,255,0.5)' }}
                      />
                    </div>
                    {/* Stats row */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium opacity-80">
                        {deck.cardsStudied || 0}/{deck.cards?.length || 0} cards
                      </span>
                      {deck.averageRating && deck.averageRating > 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium opacity-80">
                          <svg className="w-3.5 h-3.5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {deck.averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Play button on hover */}
                  <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
                    <Play size={18} fill="white" className="ml-0.5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Create New Deck Section */}
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-6">{t('dashboard.create_deck')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAIModalOpen(true)}
            className="glass p-6 rounded-[24px] flex items-center gap-4 border-white/40 text-left hover:shadow-lg transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-base font-semibold">{t('dashboard.ai_generate')}</p>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider">{t('dashboard.ai_generate_desc')}</p>
            </div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsManualModalOpen(true)}
            className="glass p-6 rounded-[24px] flex items-center gap-4 border-white/40 text-left hover:shadow-lg transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white">
              <Plus size={24} />
            </div>
            <div>
              <p className="text-base font-semibold">{t('dashboard.manual_create')}</p>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider">{t('dashboard.manual_create_desc')}</p>
            </div>
          </motion.button>
        </div>
      </section>

      {/* AI Deck Creation Modal */}
      <AnimatePresence>
        {isAIModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsAIModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass w-full max-w-lg rounded-[32px] p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="text-xl font-bold">{t('dashboard.ai_generate')}</h2>
                </div>
                <button onClick={() => setIsAIModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                    {t('explore.learning_topic')}
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder={t('explore.topic_placeholder')}
                    className="w-full glass px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                      {t('explore.target_language')}
                    </label>
                    <select
                      value={aiTargetLang}
                      onChange={(e) => setAiTargetLang(e.target.value)}
                      className="w-full glass px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">{t('explore.select_language')}</option>
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                      {t('explore.source_language')}
                    </label>
                    <select
                      value={aiSourceLang}
                      onChange={(e) => setAiSourceLang(e.target.value)}
                      className="w-full glass px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiIsPublic}
                    onChange={(e) => setAiIsPublic(e.target.checked)}
                    className="w-5 h-5 rounded accent-blue-500"
                  />
                  <span className="text-sm font-medium">{t('explore.make_public')}</span>
                </label>

                <button
                  onClick={handleAIGenerate}
                  disabled={!aiTopic || !aiTargetLang || isGeneratingAI}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {t('explore.generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      {t('explore.generate_deck')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Deck Creation Modal */}
      <AnimatePresence>
        {isManualModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsManualModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass w-full max-w-2xl rounded-[32px] p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white">
                    <Plus size={20} />
                  </div>
                  <h2 className="text-xl font-bold">{t('dashboard.manual_create')}</h2>
                </div>
                <button onClick={() => setIsManualModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                    {t('explore.deck_title')}
                  </label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder={t('explore.deck_title_placeholder')}
                    className="w-full glass px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                      {t('explore.target_language')}
                    </label>
                    <select
                      value={manualTargetLang}
                      onChange={(e) => setManualTargetLang(e.target.value)}
                      className="w-full glass px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    >
                      <option value="">{t('explore.select_language')}</option>
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                      {t('explore.source_language')}
                    </label>
                    <select
                      value={manualSourceLang}
                      onChange={(e) => setManualSourceLang(e.target.value)}
                      className="w-full glass px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cards Section */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 block">
                    {t('explore.cards')} ({manualCards.length})
                  </label>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {manualCards.map((card, i) => (
                      <div key={i} className="glass p-4 rounded-xl space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={card.word}
                            onChange={(e) => updateManualCard(i, 'word', e.target.value)}
                            placeholder={t('explore.word')}
                            className="flex-1 glass px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                          />
                          <input
                            type="text"
                            value={card.translation}
                            onChange={(e) => updateManualCard(i, 'translation', e.target.value)}
                            placeholder={t('explore.translation')}
                            className="flex-1 glass px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                          />
                          <select
                            value={card.type}
                            onChange={(e) => updateManualCard(i, 'type', e.target.value)}
                            className="glass px-2 py-2 rounded-lg text-sm focus:outline-none"
                          >
                            <option value="Noun">Noun</option>
                            <option value="Verb">Verb</option>
                            <option value="Adjective">Adj</option>
                            <option value="Phrase">Phrase</option>
                          </select>
                          {manualCards.length > 1 && (
                            <button
                              onClick={() => removeManualCard(i)}
                              className="text-red-400 hover:text-red-600 p-2"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={card.sample_sentence}
                          onChange={(e) => updateManualCard(i, 'sample_sentence', e.target.value)}
                          placeholder={t('explore.sample_sentence')}
                          className="w-full glass px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addManualCard}
                    className="mt-3 w-full glass py-2 rounded-xl text-sm font-medium text-green-600 hover:bg-green-50 flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    {t('explore.add_card')}
                  </button>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualIsPublic}
                    onChange={(e) => setManualIsPublic(e.target.checked)}
                    className="w-5 h-5 rounded accent-green-500"
                  />
                  <span className="text-sm font-medium">{t('explore.make_public')}</span>
                </label>

                <button
                  onClick={handleManualCreate}
                  disabled={!manualTitle || !manualTargetLang || isCreatingManual}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreatingManual ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {t('explore.creating')}
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      {t('explore.create_deck')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
