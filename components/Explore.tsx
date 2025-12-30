
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Plus, Globe, Filter, X, Loader2, Copy } from 'lucide-react';
import { generateDeck } from '../services/geminiService';
import { deckService } from '../services/deckService';
import { cardService } from '../services/cardService';
import { useAuth } from '../contexts/AuthContext';
import { Deck, Card } from '../types';

interface ExploreProps {
  onAddDeck: (deck: Deck) => void;
}

const FEATURED_DECKS = [
  { id: 'f1', title: 'Kyoto Cafe Phrases', lang: 'Japanese', count: 45, author: 'Sato M.', gradient: 'linear-gradient(135deg, #FF6B6B, #FFD93D)' },
  { id: 'f2', title: 'Berlin Tech Talk', lang: 'German', count: 120, author: 'Erik K.', gradient: 'linear-gradient(135deg, #4ECDC4, #556270)' },
  { id: 'f3', title: 'Paris Fashion Week', lang: 'French', count: 88, author: 'Chloé B.', gradient: 'linear-gradient(135deg, #A8E6CF, #DCEDC1)' },
  { id: 'f4', title: 'Medical Spanish', lang: 'Spanish', count: 350, author: 'Elena R.', gradient: 'linear-gradient(135deg, #D4FC79, #96E6A1)' },
];

const Explore: React.FC<ExploreProps> = ({ onAddDeck }) => {
  const { user, profile } = useAuth();
  const [search, setSearch] = useState('');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [topic, setTopic] = useState('');
  // Use profile language preferences as defaults
  const [language, setLanguage] = useState(profile?.target_lang || '');
  const [sourceLanguage, setSourceLanguage] = useState(profile?.native_lang || 'English');
  const [isGenerating, setIsGenerating] = useState(false);

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

  // Load community decks
  useEffect(() => {
    const loadCommunityDecks = async () => {
      try {
        const publicDecks = await deckService.getPublicDecks();
        setCommunityDecks(publicDecks);
      } catch (error) {
        console.error('Error loading community decks:', error);
      } finally {
        setLoadingCommunity(false);
      }
    };
    loadCommunityDecks();
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
        is_public: false,
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

      await cardService.createCards(cardsToInsert);

      // Convert to local Deck format for immediate display
      const localDeck: Deck = {
        id: newDeck.id,
        title: newDeck.title,
        language: newDeck.target_lang,
        progress: 0,
        gradient: newDeck.cover_gradient,
        cards: generatedCards.map((c: any, i: number) => ({
          ...c,
          id: `${newDeck.id}-${i}`,
          difficulty: 'New' as const
        }))
      };

      onAddDeck(localDeck);
      setIsAIModalOpen(false);
      // Reset form
      setTopic('');
      setLanguage('');
      setSourceLanguage('English');
    } catch (error) {
      console.error('Generation error:', error);
      alert("Failed to generate deck. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualCreate = async () => {
    if (!manualTitle || !manualTargetLang || !user) return;
    if (manualCards.length !== 10) {
      alert("Please create exactly 10 cards.");
      return;
    }
    if (manualCards.some(c => !c.word || !c.translation || !c.sample_sentence || !c.correct_sentence)) {
      alert("Please fill in all fields for all 10 cards.");
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

      const localDeck: Deck = {
        id: newDeck.id,
        title: newDeck.title,
        language: newDeck.target_lang,
        progress: 0,
        gradient: newDeck.cover_gradient,
        cards: manualCards.map((c, i) => ({
          id: `${newDeck.id}-${i}`,
          word: c.word,
          translation: c.translation,
          type: c.type as any,
          sample_sentence: c.sample_sentence,
          correct_sentence: c.correct_sentence,
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
      alert("Failed to create deck. Please try again.");
    } finally {
      setIsCreatingManual(false);
    }
  };

  const handleCloneDeck = async (deckId: string) => {
    if (!user) return;
    try {
      await deckService.cloneDeck(deckId, user.id);
      alert("Deck cloned to your library! Check Dashboard.");
    } catch (error) {
      console.error('Clone error:', error);
      alert("Failed to clone deck.");
    }
  };

  const addCardField = () => {
    if (manualCards.length < 10) {
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
        <h1 className="text-4xl font-semibold tracking-tight">Expand Your Horizons</h1>
        <div className="w-full max-w-2xl relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search for a language, topic, or deck..."
            className="w-full glass py-6 pl-16 pr-8 rounded-[32px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-lg shadow-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <FilterChip icon={<Globe size={14} />} label="All Languages" />
          <FilterChip icon={<Sparkles size={14} />} label="AI Curated" />
          <FilterChip icon={<Filter size={14} />} label="Advanced" />
        </div>
      </header>

      <section>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Community Favorites</h2>
            <h3 className="text-2xl font-bold">Trending Decks</h3>
          </div>
          <button className="text-blue-500 text-sm font-bold hover:underline">View All</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_DECKS.map((deck) => (
            <motion.div
              key={deck.id}
              whileHover={{ scale: 1.02 }}
              className="glass overflow-hidden rounded-[32px] group cursor-pointer shadow-sm border border-white/40"
            >
              <div className="h-40 relative" style={{ background: deck.gradient }}>
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
              </div>
              <div className="p-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1 block">{deck.lang}</span>
                <h4 className="font-bold text-lg mb-1 tracking-tight">{deck.title}</h4>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{deck.count} CARDS • {deck.author}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-[#1a1a1a] rounded-[48px] p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-[120px] -z-0" />
        <div className="relative z-10 max-w-lg">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
            <Sparkles className="text-blue-400" size={24} />
          </div>
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Need something specific?</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Our AI engine can build a custom deck for any niche. "Medical French," "Japanese for Surfers," or "Corporate Mandarin."
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="flex-1 bg-white text-[#1a1a1a] px-6 py-4 rounded-2xl font-bold text-sm tracking-wide hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              AI Generate
            </button>
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex-1 bg-blue-500 text-white px-6 py-4 rounded-2xl font-bold text-sm tracking-wide hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Create Manually
            </button>
          </div>
        </div>
      </section>

      {/* Generation Modal */}
      <AnimatePresence>
        {isAIModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isGenerating && setIsAIModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative glass-dark p-10 rounded-[40px] w-full max-w-lg shadow-2xl text-white border border-white/10"
            >
              <button
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
                onClick={() => !isGenerating && setIsAIModalOpen(false)}
              >
                <X size={24} />
              </button>

              <div className="mb-8">
                <h3 className="text-2xl font-bold tracking-tight mb-2">Custom Deck AI</h3>
                <p className="text-white/40 text-sm">Tell Aura what you want to learn today.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Learning Topic</label>
                  <input
                    type="text"
                    placeholder="e.g. Scuba Diving vocabulary"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Target Language</label>
                  <input
                    type="text"
                    placeholder="e.g. Italian"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Your Native Language</label>
                  <input
                    type="text"
                    placeholder="e.g. English"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                  />
                </div>
                <button
                  disabled={isGenerating || !topic || !language}
                  onClick={handleGenerate}
                  className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-500/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Generating Sanctuary...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Generate Deck
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Deck Creation Modal */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isCreatingManual && setIsManualModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative glass-dark p-10 rounded-[40px] w-full max-w-4xl shadow-2xl text-white border border-white/10 my-8"
            >
              <button
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
                onClick={() => !isCreatingManual && setIsManualModalOpen(false)}
              >
                <X size={24} />
              </button>

              <div className="mb-8">
                <h3 className="text-2xl font-bold tracking-tight mb-2">Create Manual Deck</h3>
                <p className="text-white/40 text-sm">Create your own custom deck with exactly 10 cards.</p>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
                {/* Deck Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Deck Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Business Japanese"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Target Language</label>
                    <input
                      type="text"
                      placeholder="e.g. Japanese"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      value={manualTargetLang}
                      onChange={(e) => setManualTargetLang(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualIsPublic}
                      onChange={(e) => setManualIsPublic(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-sm">Make this deck public (visible to all users)</span>
                  </label>
                </div>

                {/* Cards */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-bold">Cards ({manualCards.length}/10)</h4>
                    {manualCards.length < 10 && (
                      <button
                        onClick={addCardField}
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                      >
                        <Plus size={16} /> Add Card
                      </button>
                    )}
                  </div>

                  {manualCards.map((card, index) => (
                    <div key={index} className="bg-white/5 rounded-2xl p-4 space-y-3 border border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-white/60">Card {index + 1}</span>
                        {manualCards.length > 1 && (
                          <button
                            onClick={() => removeCardField(index)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Word (target lang)"
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          value={card.word}
                          onChange={(e) => updateCard(index, 'word', e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Translation"
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          value={card.translation}
                          onChange={(e) => updateCard(index, 'translation', e.target.value)}
                        />
                      </div>

                      <select
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        value={card.type}
                        onChange={(e) => updateCard(index, 'type', e.target.value)}
                      >
                        <option value="Noun">Noun</option>
                        <option value="Verb">Verb</option>
                        <option value="Adjective">Adjective</option>
                        <option value="Adverb">Adverb</option>
                        <option value="Phrase">Phrase</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Example sentence (native language)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        value={card.sample_sentence}
                        onChange={(e) => updateCard(index, 'sample_sentence', e.target.value)}
                      />

                      <input
                        type="text"
                        placeholder="Correct sentence (target language)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        value={card.correct_sentence}
                        onChange={(e) => updateCard(index, 'correct_sentence', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                disabled={isCreatingManual || !manualTitle || !manualTargetLang || manualCards.length !== 10}
                onClick={handleManualCreate}
                className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-500/20 mt-6"
              >
                {isCreatingManual ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Creating Deck...
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    Create Deck ({manualCards.length}/10 cards)
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Community Decks Section */}
      <section className="mt-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Community Library</h2>
            <h3 className="text-2xl font-bold">Public Decks</h3>
          </div>
        </div>

        {loadingCommunity ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm uppercase tracking-widest">Loading community decks...</p>
          </div>
        ) : communityDecks.length === 0 ? (
          <div className="text-center py-12 glass rounded-[32px] p-8">
            <p className="text-gray-600 font-medium mb-2">No public decks yet</p>
            <p className="text-gray-400 text-sm">Be the first to create a public deck!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communityDecks.map((deck) => (
              <motion.div
                key={deck.id}
                whileHover={{ scale: 1.02 }}
                className="glass overflow-hidden rounded-[32px] group cursor-pointer shadow-sm border border-white/40"
              >
                <div className="h-40 relative" style={{ background: deck.cover_gradient }}>
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                </div>
                <div className="p-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1 block">{deck.target_lang}</span>
                  <h4 className="font-bold text-lg mb-3 tracking-tight">{deck.title}</h4>

                  {/* Creator Info */}
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                      {deck.profiles?.avatar_url ? (
                        <img src={deck.profiles.avatar_url} alt={deck.profiles.username} className="w-full h-full object-cover" />
                      ) : (
                        deck.profiles?.username?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        {deck.profiles?.username || 'Anonymous'}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(deck.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Public Deck</p>
                    <button
                      onClick={() => handleCloneDeck(deck.id)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-1"
                    >
                      <Copy size={14} />
                      Clone
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
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
