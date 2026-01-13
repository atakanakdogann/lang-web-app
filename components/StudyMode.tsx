
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, RotateCcw, CheckCircle, Trash2, Shuffle, Loader2 } from 'lucide-react';
import { Deck, AnalysisResult } from '../types';
import { analyzeSentence, generateDeck } from '../services/geminiService';
import { deckService } from '../services/deckService';
import { cardService } from '../services/cardService';
import { progressService } from '../services/progressService';
import { questService } from '../services/questService';
import { profileService } from '../services/profileService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../services/i18n';
import DeckRatingModal from './DeckRatingModal';

interface StudyModeProps {
  deck: Deck;
  onExit: () => void;
  onDeckDeleted?: (deckId: string) => void;
  onDeckRegenerated?: (newDeck: Deck) => void;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', tr: 'Turkish', de: 'German', ru: 'Russian',
  es: 'Spanish', fr: 'French', it: 'Italian', pt: 'Portuguese'
};

const StudyMode: React.FC<StudyModeProps> = ({ deck, onExit, onDeckDeleted, onDeckRegenerated }) => {
  const { profile, user } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  const currentCard = deck.cards?.[currentIndex];
  const inputRef = useRef<HTMLInputElement>(null);
  const totalCards = deck.cards?.length || 0;

  // Get language names for AI
  const nativeLang = profile?.native_lang ? LANGUAGE_NAMES[profile.native_lang] || profile.native_lang : 'English';
  const targetLang = profile?.target_lang ? LANGUAGE_NAMES[profile.target_lang] || profile.target_lang : 'English';

  // Resume from last studied card
  useEffect(() => {
    const loadLastPosition = async () => {
      if (!user || !deck.cards || deck.cards.length === 0) {
        setIsLoadingProgress(false);
        return;
      }

      try {
        // Get the deck progress to find which cards have been studied
        const progress = await progressService.getDeckProgress(user.id, deck.id);
        if (progress && progress.cardsStudied > 0 && progress.cardsStudied < totalCards) {
          // Resume from the next unstudied card
          setCurrentIndex(progress.cardsStudied);
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadLastPosition();
  }, [user, deck.id, deck.cards, totalCards]);

  useEffect(() => {
    if (!isRevealed && !isComplete && !isLoadingProgress) {
      inputRef.current?.focus();
    }
  }, [currentIndex, isRevealed, isComplete, isLoadingProgress]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const result = await analyzeSentence(
        currentCard.word,
        inputValue,
        currentCard.correct_sentence || currentCard.sample_sentence,
        nativeLang,
        targetLang
      );
      setAnalysis(result);
      setIsRevealed(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setInputValue('');
    setIsRevealed(false);
    setAnalysis(null);
  };

  const handleNext = async () => {
    // Save rating before moving to next card
    if (analysis && analysis.rating && user && currentCard) {
      try {
        await progressService.saveCardRating(user.id, currentCard.id, analysis.rating);
        // Track quest progress
        await questService.recordCardStudy(user.id, analysis.rating);
        // Increment cumulative words learned count (never decreases)
        await profileService.incrementWordsLearned(user.id, 1);
        // Update streak
        await profileService.updateStreak(user.id);
      } catch (error) {
        console.error('Failed to save rating:', error);
      }
    }

    if (currentIndex < (deck.cards?.length || 0) - 1) {
      setCurrentIndex(currentIndex + 1);
      setInputValue('');
      setIsRevealed(false);
      setAnalysis(null);
    } else {
      // Reached the end, show completion screen
      setIsComplete(true);
      // Track deck completion for weekly quest
      if (user) {
        try {
          await questService.recordDeckCompletion(user.id);
        } catch (error) {
          console.error('Failed to record deck completion:', error);
        }
      }
    }
  };

  const handleStartOver = () => {
    setCurrentIndex(0);
    setInputValue('');
    setIsRevealed(false);
    setAnalysis(null);
    setIsComplete(false);
  };

  // Fresh Start: Regenerate deck with new words
  const handleFreshStart = async () => {
    if (!user || !profile || isRegenerating) return;

    setIsRegenerating(true);
    try {
      // Extract topic from deck title (remove emoji and level)
      const topic = deck.title.replace(/^[^\w]+/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();

      // Generate new cards
      const generatedCards = await generateDeck(
        topic,
        profile.target_lang || 'en',
        profile.native_lang || 'en',
        profile.proficiency_level || 'B1'
      );

      // Delete old cards and add new ones
      await cardService.deleteCardsForDeck(deck.id);
      const cardsToInsert = generatedCards.map((c: any) => ({
        deck_id: deck.id,
        word: c.word,
        translation: c.translation,
        type: c.type,
        sample_sentence: c.sample_sentence,
        ai_context: c.correct_sentence,
      }));
      const insertedCards = await cardService.createCards(cardsToInsert);

      // Create updated deck object with real database IDs
      const newDeck: Deck = {
        ...deck,
        progress: 0,
        averageRating: 0,
        cardsStudied: 0,
        cards: insertedCards.map((dbCard: any, i: number) => ({
          id: dbCard.id,
          word: dbCard.word,
          translation: dbCard.translation,
          type: dbCard.type,
          sample_sentence: dbCard.sample_sentence,
          correct_sentence: generatedCards[i].correct_sentence,
          difficulty: 'New' as const
        }))
      };

      onDeckRegenerated?.(newDeck);
      onExit();
    } catch (error) {
      console.error('Failed to regenerate deck:', error);
      toast.error('Regeneration Failed', 'Could not regenerate deck. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Finish: Remove deck from collection (only delete from DB if private/owned)
  const handleFinish = async () => {
    if (!user || isDeleting) return;

    // For public decks, just remove from local state, don't delete from DB
    if (deck.is_public) {
      if (!confirm(t('study.confirm_remove'))) return;
      onDeckDeleted?.(deck.id);
      onExit();
      return;
    }

    // For private decks, actually delete from database
    if (!confirm(t('study.confirm_delete'))) return;

    setIsDeleting(true);
    try {
      await deckService.deleteDeck(deck.id);
      onDeckDeleted?.(deck.id);
      onExit();
    } catch (error) {
      console.error('Failed to delete deck:', error);
      toast.error('Deletion Failed', 'Could not delete deck. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Completion Screen
  if (isComplete) {
    return (
      <div className="w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-10 text-center border border-white/50"
        >
          <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold tracking-tight mb-3">{t('study.session_complete')}</h2>
          <p className="text-gray-600 mb-8">{t('study.completed_all')}</p>

          {/* 3 Option Buttons */}
          <div className="space-y-3">
            {/* Start Over - Practice same cards again */}
            <button
              onClick={handleStartOver}
              disabled={isRegenerating || isDeleting}
              className="w-full bg-blue-500 text-white py-4 px-6 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <RotateCcw size={18} />
              <span>{t('study.start_over')}</span>
            </button>

            {/* Fresh Start - New words, same topic */}
            <button
              onClick={handleFreshStart}
              disabled={isRegenerating || isDeleting}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-2xl font-bold text-sm uppercase tracking-widest hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isRegenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t('study.generating_new')}</span>
                </>
              ) : (
                <>
                  <Shuffle size={18} />
                  <span>{t('study.fresh_start')}</span>
                </>
              )}
            </button>

            {/* Finish - Delete deck */}
            <button
              onClick={handleFinish}
              disabled={isRegenerating || isDeleting}
              className="w-full bg-gray-100 text-gray-600 py-4 px-6 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all border border-gray-200 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t('study.deleting')}</span>
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  <span>{t('study.finish_delete')}</span>
                </>
              )}
            </button>
          </div>

          {/* Descriptions */}
          <div className="mt-6 text-xs text-gray-400 space-y-1">
            <p><strong>{t('study.start_over')}</strong>: {t('study.start_over_desc')}</p>
            <p><strong>{t('study.fresh_start')}</strong>: {t('study.fresh_start_desc')}</p>
            <p><strong>{t('study.finish_delete')}</strong>: {t('study.finish_delete_desc')}</p>
          </div>
        </motion.div>

        {/* Rating Modal - Shows for any deck */}
        <DeckRatingModal
          isOpen={showRatingModal}
          deckId={deck.id}
          deckTitle={deck.title}
          onClose={() => setShowRatingModal(false)}
          onRated={() => setHasRated(true)}
        />

        {/* Rate This Deck Button - Shows if not rated yet */}
        {!hasRated && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => setShowRatingModal(true)}
            className="mt-4 text-sm text-blue-500 hover:text-blue-600 font-medium"
          >
            ⭐ {t('study.rate_deck')}
          </motion.button>
        )}
      </div>
    );
  }

  // Show loading while checking progress
  if (isLoadingProgress) {
    return (
      <div className="w-full max-w-xl">
        <div className="glass rounded-[40px] shadow-lg p-12 text-center border border-white/50">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 font-medium">{t('study.loading_progress')}</p>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="text-center p-12 glass rounded-[32px]">
        <h2 className="text-xl font-bold">{t('study.no_cards')}</h2>
        <button onClick={onExit} className="mt-4 text-blue-500 font-bold">{t('study.return_dashboard')}</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl relative">
      {/* Close button localized to the card area */}
      <button
        onClick={onExit}
        className="absolute -top-16 right-0 p-3 rounded-full glass hover:bg-white/40 transition-all z-50"
      >
        <X size={20} />
      </button>

      <motion.div
        layout
        transition={{ type: "spring", bounce: 0.1, duration: 0.6 }}
        className="glass rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-8 md:p-12 overflow-hidden flex flex-col items-center border border-white/50"
        style={{ perspective: 1200 }}
      >
        {/* Card Counter & Progress */}
        <div className="flex flex-col items-center mb-8">
          <div className="text-2xl font-bold text-gray-800 mb-2">
            {currentIndex + 1} <span className="text-gray-400">/</span> {totalCards}
          </div>
          <div className="w-48 h-2 bg-black/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={false}
              animate={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
            />
          </div>
        </div>

        {/* 3D Flip Animation Container */}
        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.div
              key="front"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
              className="w-full space-y-8 flex flex-col items-center"
            >
              <div className="text-center">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500 mb-4 block">
                  {currentCard.type}
                </span>
                <h2 className="text-5xl font-bold tracking-tight mb-2">
                  {currentCard.word}
                </h2>
                <p className="text-gray-400 font-medium text-lg">
                  {currentCard.translation}
                </p>
              </div>

              <div className="w-full space-y-4">
                <div className="bg-white/40 rounded-2xl p-6 border border-white/50">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-3">
                    {t('study.example')}
                  </span>
                  <p className="text-lg font-medium text-gray-700 text-center">
                    {currentCard.sample_sentence}
                  </p>
                </div>

                <p className="text-center text-sm text-gray-500 italic">
                  {t('study.write_sentence')} <strong>{currentCard.word}</strong>
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={`Type your sentence using "${currentCard.word}"...`}
                      className="w-full bg-transparent border-b-2 border-black/5 py-4 px-2 pr-12 text-xl font-medium focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                    {/* Inline submit arrow for quick submission */}
                    <button
                      type="submit"
                      disabled={isLoading || !inputValue.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-blue-500 transition-colors disabled:opacity-30 z-10"
                    >
                      {isLoading ? (
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                      ) : (
                        <ArrowRight size={24} />
                      )}
                    </button>
                  </div>
                  {/* Full-width submit button for better mobile UX */}
                  <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{t('common.loading')}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>{t('study.ai_analysis')}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 90, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
              className="w-full space-y-8"
            >
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">{t('study.correct_sentence')}</span>
                  <p className="text-xl font-medium text-emerald-600">{currentCard.correct_sentence || currentCard.sample_sentence}</p>
                </div>

                <div className="p-6 bg-white/30 rounded-2xl border border-white/50">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">{t('study.your_submission')}</span>
                  <p className="text-lg font-mono text-gray-700">{inputValue}</p>
                </div>

                {analysis && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="text-blue-500" size={20} />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500">{t('study.ai_analysis')}</span>
                      </div>

                      {/* Star Rating Display */}
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const rating = analysis.rating || 0;
                            const filled = rating >= star;
                            const half = !filled && rating >= star - 0.5;
                            return (
                              <div key={star} className="relative w-6 h-6">
                                {/* Empty star (background) */}
                                <svg className="absolute w-6 h-6 text-gray-200" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {/* Filled star */}
                                {filled && (
                                  <svg className="absolute w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                )}
                                {/* Half star */}
                                {half && (
                                  <svg className="absolute w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" style={{ clipPath: 'inset(0 50% 0 0)' }}>
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <span className="text-lg font-bold text-yellow-500">{analysis.rating?.toFixed(1) || '0.0'}</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed">{analysis.explanation}</p>
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleTryAgain}
                  className="bg-orange-500 text-white py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-orange-600 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  {t('study.try_again')}
                </button>
                <button
                  onClick={handleNext}
                  className="bg-blue-500 text-white py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-blue-600 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {t('study.next')}
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default StudyMode;
