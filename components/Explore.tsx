
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Plus, Globe, Filter, X, Loader2, Copy, Star, Users, TrendingUp, Clock, Wand2, PenLine, ArrowRight } from 'lucide-react';
import { generateDeck } from '../services/geminiService';
import { deckService } from '../services/deckService';
import { cardService } from '../services/cardService';
import { deckStatsService, DeckStats } from '../services/deckStatsService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../services/i18n';
import { Deck, Card } from '../types';

interface ExploreProps {
  onAddDeck: (deck: Deck) => void;
}

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

const Explore: React.FC<ExploreProps> = ({ onAddDeck }) => {
  const { user, profile } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [topic, setTopic] = useState('');
  // Use profile language preferences as defaults
  const [language, setLanguage] = useState(profile?.target_lang || '');
  const [sourceLanguage, setSourceLanguage] = useState(profile?.native_lang || 'English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  // Manual deck creation states
  const [manualTitle, setManualTitle] = useState('');
  const [manualSourceLang, setManualSourceLang] = useState(profile?.native_lang || 'English');
  const [manualTargetLang, setManualTargetLang] = useState(profile?.target_lang || '');
  const [manualIsPublic, setManualIsPublic] = useState(false);
  const [manualCards, setManualCards] = useState<Array<{
    word: string;
    translation: string;
    type: string;
    sample_sentence: string;
    correct_sentence: string;
  }>>([{ word: '', translation: '', type: 'Noun', sample_sentence: '', correct_sentence: '' }]);
  const [isCreatingManual, setIsCreatingManual] = useState(false);

  // Community decks
  const [communityDecks, setCommunityDecks] = useState<any[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [deckStats, setDeckStats] = useState<Map<string, DeckStats>>(new Map());
  const [activeCategory, setActiveCategory] = useState<'all' | 'popular' | 'new'>('all');

  // Filter states
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'ai' | 'manual'>('all');
  const [visibleCount, setVisibleCount] = useState(3);

  // Load community decks and stats
  useEffect(() => {
    const loadCommunityDecks = async () => {
      setLoadingCommunity(true);
      try {
        let publicDecks = [];
        const limit = 20; // Fetch 20 items as requested

        if (activeCategory === 'popular') {
          // fetch popular deck IDs first
          const popularIds = await deckStatsService.getPopularDecks(limit);
          if (popularIds.length > 0) {
            publicDecks = await deckService.getDecksByIds(popularIds);
            // Sort to match the order of IDs returned by getPopularDecks
            publicDecks.sort((a, b) => popularIds.indexOf(a.id) - popularIds.indexOf(b.id));
          }
        } else {
          // fetch recent/all decks
          publicDecks = await deckService.getPublicDecks(limit);
        }

        setCommunityDecks(publicDecks);
        setVisibleCount(3); // Reset to showing 3 initially

        // Load stats for these specific decks
        if (publicDecks.length > 0) {
          const deckIds = publicDecks.map((d: any) => d.id);
          const stats = await deckStatsService.getMultipleDeckStats(deckIds);
          setDeckStats(stats);
        }
      } catch (error) {
        console.error('Error loading community decks:', error);
      } finally {
        setLoadingCommunity(false);
      }
    };
    loadCommunityDecks();
  }, [activeCategory]);

  // Listen for modal open events from Dashboard
  useEffect(() => {
    const openAI = () => setIsAIModalOpen(true);
    const openManual = () => setIsManualModalOpen(true);

    window.addEventListener('openAIModal', openAI);
    window.addEventListener('openManualModal', openManual);

    return () => {
      window.removeEventListener('openAIModal', openAI);
      window.removeEventListener('openManualModal', openManual);
    };
  }, []);

  const handleGenerate = async () => {
    if (!topic || !language || !user) return;
    setIsGenerating(true);
    try {
      // Generate cards with AI using user's proficiency level
      const generatedCards = await generateDeck(
        topic,
        language,
        sourceLanguage,
        profile?.proficiency_level || 'B1'
      );

      // Create deck in Supabase
      const gradient = `linear-gradient(135deg, ${getRandomColor()}, ${getRandomColor()})`;
      const newDeck = await deckService.createDeck({
        created_by: user.id,
        title: topic.charAt(0).toUpperCase() + topic.slice(1),
        source_lang: sourceLanguage,
        target_lang: language,
        is_public: isPublic,
        is_ai_generated: true,
        cover_gradient: gradient,
      });

      // Save cards to Supabase
      const cardsToInsert = generatedCards.map((c: any) => ({
        deck_id: newDeck.id,
        word: c.word,
        translation: c.translation,
        type: c.type,
        sample_sentence: c.sample_sentence,
        ai_context: c.correct_sentence || null,
      }));

      const createdCards = await cardService.createCards(cardsToInsert);

      // Convert to local Deck format for immediate display
      const localDeck: Deck = {
        id: newDeck.id,
        title: newDeck.title,
        language: newDeck.target_lang,
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
      // Reload community decks if marked public
      if (isPublic) {
        const publicDecks = await deckService.getPublicDecks();
        setCommunityDecks(publicDecks);
      }
      // Reset form
      setTopic('');
      setLanguage('');
      setIsPublic(false);
      setSourceLanguage('English');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Generation Failed', 'Could not generate deck. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualCreate = async () => {
    if (!manualTitle || !manualTargetLang || !user) return;
    if (manualCards.length < 3) {
      toast.warning('Not Enough Cards', 'Please create at least 3 cards.');
      return;
    }
    if (manualCards.some(c => !c.word || !c.translation || !c.sample_sentence || !c.correct_sentence)) {
      toast.warning('Incomplete Cards', 'Please fill in all fields for all cards.');
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
        cover_gradient: gradient,
      });

      const cardsToInsert = manualCards.map((c) => ({
        deck_id: newDeck.id,
        word: c.word,
        translation: c.translation,
        type: c.type,
        sample_sentence: c.sample_sentence,
        ai_context: c.correct_sentence,
      }));

      await cardService.createCards(cardsToInsert);

      // Fetch actual cards with real IDs
      const createdCards = await cardService.getCardsForDeck(newDeck.id);

      const localDeck: Deck = {
        id: newDeck.id,
        title: newDeck.title,
        language: newDeck.target_lang,
        progress: 0,
        gradient: newDeck.cover_gradient,
        cards: createdCards.map((c) => ({
          id: c.id,
          word: c.word,
          translation: c.translation,
          type: c.type as any,
          sample_sentence: c.sample_sentence,
          correct_sentence: c.ai_context,
          difficulty: 'New' as const
        }))
      };

      onAddDeck(localDeck);
      setIsManualModalOpen(false);

      // Reset form
      setManualTitle('');
      setManualSourceLang('English');
      setManualTargetLang('');
      setManualIsPublic(false);
      setManualCards([{ word: '', translation: '', type: 'Noun', sample_sentence: '', correct_sentence: '' }]);

      // Reload community decks if marked public
      if (manualIsPublic) {
        const publicDecks = await deckService.getPublicDecks();
        setCommunityDecks(publicDecks);
      }
    } catch (error) {
      console.error('Creation error:', error);
      toast.error('Creation Failed', 'Could not create deck. Please try again.');
    } finally {
      setIsCreatingManual(false);
    }
  };

  const handleCloneDeck = async (deckId: string) => {
    if (!user) return;
    try {
      await deckService.cloneDeck(deckId, user.id);
      toast.success('Deck Cloned!', 'Deck added to your library. Check Dashboard.');
    } catch (error) {
      console.error('Clone error:', error);
      toast.error('Clone Failed', 'Could not clone this deck.');
    }
  };

  const addCardField = () => {
    if (manualCards.length < 20) {
      setManualCards([...manualCards, { word: '', translation: '', type: 'Noun', sample_sentence: '', correct_sentence: '' }]);
    }
  };

  const removeCardField = (index: number) => {
    if (manualCards.length > 1) {
      setManualCards(manualCards.filter((_, i) => i !== index));
    }
  };

  const updateCard = (index: number, field: string, value: string) => {
    const updated = [...manualCards];
    updated[index] = { ...updated[index], [field]: value };
    setManualCards(updated);
  };

  const getRandomColor = () => {
    const colors = ['#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col items-center gap-6">
        <h1 className="text-4xl font-semibold tracking-tight">{t('explore.title')}</h1>
        <div className="w-full max-w-2xl relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('explore.search_placeholder')}
            className="w-full glass py-6 pl-16 pr-8 rounded-[32px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-lg shadow-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          {/* Language Filter */}
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="glass px-4 py-2.5 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none bg-no-repeat bg-right pr-10"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center' }}
          >
            <option value="all">{t('explore.all_languages')}</option>
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'ai' | 'manual')}
            className="glass px-4 py-2.5 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none bg-no-repeat bg-right pr-10"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center' }}
          >
            <option value="all">{t('explore.all_types')}</option>
            <option value="ai">{t('explore.ai_only')}</option>
            <option value="manual">{t('explore.manual_only')}</option>
          </select>

          {/* Clear Filters */}
          {(filterLanguage !== 'all' || filterType !== 'all' || search) && (
            <button
              onClick={() => { setFilterLanguage('all'); setFilterType('all'); setSearch(''); }}
              className="glass px-4 py-2.5 rounded-full text-sm font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1.5"
            >
              <X size={14} />
              {t('explore.clear_filters')}
            </button>
          )}
        </div>
      </header>


      {/* Community Decks Section */}
      <section className="mt-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">{t('explore.community_library')}</h2>
            <h3 className="text-2xl font-bold">{t('explore.public_decks')}</h3>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 glass rounded-full p-1">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${activeCategory === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Globe size={14} />
              {t('explore.tab_all')}
            </button>
            <button
              onClick={() => setActiveCategory('popular')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${activeCategory === 'popular' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <TrendingUp size={14} />
              {t('explore.tab_popular')}
            </button>
            <button
              onClick={() => setActiveCategory('new')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${activeCategory === 'new' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Clock size={14} />
              {t('explore.tab_new')}
            </button>
          </div>
        </div>

        {
          loadingCommunity ? (
            <div className="text-center py-12">
              <Loader2 className="animate-spin mx-auto mb-3 text-gray-400" size={32} />
              <p className="text-gray-400 text-sm uppercase tracking-widest">{t('explore.loading_community')}</p>
            </div>
          ) : communityDecks.length === 0 ? (
            <div className="text-center py-12 glass rounded-[32px] p-8">
              <p className="text-gray-600 font-medium mb-2">{t('explore.no_public')}</p>
              <p className="text-gray-400 text-sm">{t('explore.be_first')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(() => {
                  // Filter decks based on search and filters
                  let filteredDecks = communityDecks.filter(deck => {
                    // Search filter (title, creator username)
                    const searchLower = search.toLowerCase().trim();
                    if (searchLower) {
                      const matchesTitle = deck.title?.toLowerCase().includes(searchLower);
                      const matchesCreator = deck.profiles?.username?.toLowerCase().includes(searchLower);
                      if (!matchesTitle && !matchesCreator) return false;
                    }

                    // Language filter
                    if (filterLanguage !== 'all' && deck.target_lang !== filterLanguage) {
                      return false;
                    }

                    // AI/Manual filter
                    if (filterType === 'ai' && deck.is_ai_generated === false) return false;
                    if (filterType === 'manual' && deck.is_ai_generated !== false) return false;

                    return true;
                  });

                  // Only sort if NOT popular (popular is already sorted by server)
                  if (activeCategory === 'new') {
                    filteredDecks.sort((a, b) =>
                      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );
                  }

                  const displayDecks = filteredDecks.slice(0, visibleCount);

                  return (
                    <>
                      {displayDecks.map((deck) => {
                        const stats = deckStats.get(deck.id);
                        const cloneLabel = stats ? deckStatsService.formatCloneCount(stats.cloneCount) : null;
                        const avgRating = stats?.avgRating || 0;
                        const ratingCount = stats?.ratingCount || 0;

                        return (
                          <motion.div
                            key={deck.id}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleCloneDeck(deck.id)}
                            className="glass overflow-hidden rounded-[32px] group cursor-pointer shadow-sm border border-white/40"
                          >
                            <div className="h-36 relative" style={{ background: deck.cover_gradient }}>
                              <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />

                              {/* Stats Badges */}
                              <div className="absolute top-3 right-3 flex gap-2">
                                {cloneLabel && (
                                  <div className="bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                    <Users size={12} className="text-blue-500" />
                                    <span className="text-xs font-bold text-gray-700">{cloneLabel}</span>
                                  </div>
                                )}
                                {ratingCount > 0 && (
                                  <div className="bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                    <span className="text-xs font-bold text-gray-700">{avgRating.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="p-5">
                              {/* Language pair and AI/Manual badge */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                                  <span className="text-gray-400">
                                    {LANGUAGES.find(l => l.code === deck.source_lang)?.flag || '🌐'}
                                  </span>
                                  <ArrowRight size={10} className="text-gray-300" />
                                  <span className="text-blue-500">
                                    {LANGUAGES.find(l => l.code === deck.target_lang)?.flag || '🌐'}
                                    {' '}
                                    {LANGUAGES.find(l => l.code === deck.target_lang)?.name || deck.target_lang}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {deck.level && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-600">
                                      {deck.level}
                                    </span>
                                  )}
                                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${deck.is_ai_generated !== false
                                    ? 'bg-purple-100 text-purple-600'
                                    : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {deck.is_ai_generated !== false ? (
                                      <><Wand2 size={10} /> {t('explore.ai_badge')}</>
                                    ) : (
                                      <><PenLine size={10} /> {t('explore.manual_badge')}</>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <h4 className="font-bold text-lg mb-3 tracking-tight line-clamp-1">{deck.title}</h4>

                              {/* Creator Info */}
                              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                                <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                  {deck.profiles?.avatar_url ? (
                                    <img src={deck.profiles.avatar_url} alt={deck.profiles.username} className="w-full h-full object-cover" />
                                  ) : (
                                    deck.profiles?.username?.charAt(0).toUpperCase() || '?'
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-700 truncate">
                                    {deck.profiles?.username || 'Anonymous'}
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    {new Date(deck.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              <div className="flex justify-between items-center">
                                {/* Rating Display */}
                                <div className="flex items-center gap-1">
                                  {ratingCount > 0 ? (
                                    <>
                                      {[1, 2, 3, 4, 5].map(star => (
                                        <Star
                                          key={star}
                                          size={12}
                                          className={star <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
                                        />
                                      ))}
                                      <span className="text-[10px] text-gray-400 ml-1">({ratingCount})</span>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">{t('explore.no_rating')}</span>
                                  )}
                                </div>
                                <button
                                  className="text-blue-500 hover:text-blue-600 font-bold text-xs flex items-center gap-1"
                                >
                                  <Copy size={12} />
                                  {t('explore.clone')}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
              {/* See More Button */}
              {(() => {
                // Re-calculate filtered count to determine if button should show
                const filteredCount = communityDecks.filter(deck => {
                  const searchLower = search.toLowerCase().trim();
                  if (searchLower) {
                    const matchesTitle = deck.title?.toLowerCase().includes(searchLower);
                    const matchesCreator = deck.profiles?.username?.toLowerCase().includes(searchLower);
                    if (!matchesTitle && !matchesCreator) return false;
                  }
                  if (filterLanguage !== 'all' && deck.target_lang !== filterLanguage) return false;
                  if (filterType === 'ai' && deck.is_ai_generated === false) return false;
                  if (filterType === 'manual' && deck.is_ai_generated !== false) return false;
                  return true;
                }).length;

                const hiddenCount = filteredCount - visibleCount;

                return hiddenCount > 0 ? (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setVisibleCount(prev => prev + 20)}
                      className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-3 rounded-full font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 border border-gray-100"
                    >
                      {t('explore.see_more') || 'See More'} ({hiddenCount} more)
                    </button>
                  </div>
                ) : null;
              })()}
            </>
          )
        }
      </section>
    </div>
  );
};

const FilterChip: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <button className="flex items-center gap-2 px-6 py-3 glass rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-white/40 transition-colors">
    {icon}
    {label}
  </button>
);

export default Explore;
