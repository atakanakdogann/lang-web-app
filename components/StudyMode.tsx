
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, RotateCcw, CheckCircle } from 'lucide-react';
import { Deck, AnalysisResult } from '../types';
import { analyzeSentence } from '../services/geminiService';
import { progressService } from '../services/progressService';
import { useAuth } from '../contexts/AuthContext';

interface StudyModeProps {
  deck: Deck;
  onExit: () => void;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  it: 'Italian', pt: 'Portuguese', tr: 'Turkish', ja: 'Japanese',
  ko: 'Korean', zh: 'Chinese', ru: 'Russian', ar: 'Arabic'
};

const StudyMode: React.FC<StudyModeProps> = ({ deck, onExit }) => {
  const { profile, user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const currentCard = deck.cards?.[currentIndex];
  const inputRef = useRef<HTMLInputElement>(null);

  // Get language names for AI
  const nativeLang = profile?.native_lang ? LANGUAGE_NAMES[profile.native_lang] || profile.native_lang : 'English';
  const targetLang = profile?.target_lang ? LANGUAGE_NAMES[profile.target_lang] || profile.target_lang : 'English';

  useEffect(() => {
    if (!isRevealed && !isComplete) {
      inputRef.current?.focus();
    }
  }, [currentIndex, isRevealed, isComplete]);

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
    }
  };

  const handleStartOver = () => {
    setCurrentIndex(0);
    setInputValue('');
    setIsRevealed(false);
    setAnalysis(null);
    setIsComplete(false);
  };

  const handleFinish = () => {
    // TODO: Trigger regeneration of deck cards
    onExit();
  };

  // Completion Screen
  if (isComplete) {
    return (
      <div className="w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-12 text-center border border-white/50"
        >
          <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold tracking-tight mb-3">Session Complete!</h2>
          <p className="text-gray-600 mb-8">You've completed all {deck.cards?.length || 0} cards in this deck.</p>

          <div className="flex gap-4">
            <button
              onClick={handleStartOver}
              className="flex-1 bg-blue-500 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg"
            >
              <RotateCcw className="inline mr-2" size={16} />
              Start Over
            </button>
            <button
              onClick={handleFinish}
              className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg"
            >
              <CheckCircle className="inline mr-2" size={16} />
              Finish
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Start Over: Review the same cards | Finish: Generate new cards next time
          </p>
        </motion.div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="text-center p-12 glass rounded-[32px]">
        <h2 className="text-xl font-bold">No cards available</h2>
        <button onClick={onExit} className="mt-4 text-blue-500 font-bold">Return to Dashboard</button>
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
      >
        {/* Progress Indicator */}
        <div className="w-32 h-1 bg-black/5 rounded-full mb-12 overflow-hidden">
          <motion.div
            className="h-full bg-blue-500"
            initial={false}
            animate={{ width: `${((currentIndex + 1) / (deck.cards?.length || 1)) * 100}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.div
              key="front"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
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
                    Example (Context)
                  </span>
                  <p className="text-lg font-medium text-gray-700 text-center">
                    {currentCard.sample_sentence}
                  </p>
                </div>

                <p className="text-center text-sm text-gray-500 italic">
                  Write a sentence using <strong>{currentCard.word}</strong>
                </p>

                <form onSubmit={handleSubmit} className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`Type your sentence using "${currentCard.word}"...`}
                    className="w-full bg-transparent border-b-2 border-black/5 py-4 px-2 text-xl font-medium focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    className="absolute right-2 bottom-4 text-gray-300 hover:text-blue-500 transition-colors disabled:opacity-30"
                  >
                    {isLoading ? (
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                    ) : (
                      <ArrowRight size={24} />
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-8"
            >
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Correct Sentence</span>
                  <p className="text-xl font-medium text-emerald-600">{currentCard.correct_sentence || currentCard.sample_sentence}</p>
                </div>

                <div className="p-6 bg-white/30 rounded-2xl border border-white/50">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Your Submission</span>
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
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500">AI Analysis</span>
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
                  Try Again
                </button>
                <button
                  onClick={handleNext}
                  className="bg-blue-500 text-white py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-blue-600 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  Next
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
