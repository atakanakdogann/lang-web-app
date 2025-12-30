
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Search,
  User,
  Plus
} from 'lucide-react';
import { AppView, Deck } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { deckService } from './services/deckService';
import { cardService } from './services/cardService';
import { progressService } from './services/progressService';
import Dashboard from './components/Dashboard';
import StudyMode from './components/StudyMode';
import Explore from './components/Explore';
import Profile from './components/Profile';
import Landing from './components/Landing';
import LanguageSetup from './components/LanguageSetup';

const MainApp: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [view, setView] = useState<AppView>('Dashboard');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [loadingDecks, setLoadingDecks] = useState(true);

  // Load user's decks from Supabase
  useEffect(() => {
    const loadDecks = async () => {
      if (!user) {
        setDecks([]);
        setLoadingDecks(false);
        return;
      }

      try {
        const userDecks = await deckService.getUserDecks(user.id);

        // Convert to local Deck format with cards
        const decksWithCards = await Promise.all(
          userDecks.map(async (dbDeck) => {
            const cards = await cardService.getCardsForDeck(dbDeck.id);
            return {
              id: dbDeck.id,
              title: dbDeck.title,
              language: dbDeck.target_lang,
              progress: 0,
              gradient: dbDeck.cover_gradient,
              averageRating: 0,
              cardsStudied: 0,
              cards: cards.map(card => ({
                id: card.id,
                word: card.word,
                translation: card.translation,
                type: card.type as any,
                sample_sentence: card.sample_sentence,
                correct_sentence: card.ai_context || undefined,
                difficulty: 'New' as const
              }))
            };
          })
        );

        // Load progress for all decks
        const deckIds = decksWithCards.map(d => d.id);
        const progressMap = await progressService.getAllDecksProgress(user.id, deckIds);

        // Merge progress into decks
        const decksWithProgress = decksWithCards.map(deck => {
          const progress = progressMap.get(deck.id);
          if (progress) {
            return {
              ...deck,
              progress: progress.progress,
              averageRating: progress.averageRating,
              cardsStudied: progress.cardsStudied
            };
          }
          return deck;
        });

        setDecks(decksWithProgress);
      } catch (error) {
        console.error('Error loading decks:', error);
      } finally {
        setLoadingDecks(false);
      }
    };

    loadDecks();
  }, [user]);

  const startStudy = (deck: Deck) => {
    if (!deck.cards || deck.cards.length === 0) {
      alert("This deck is empty! Try exploring or generating a custom one.");
      return;
    }
    setActiveDeck(deck);
    setView('Study');
  };

  const handleAddDeck = (newDeck: Deck) => {
    setDecks(prev => [newDeck, ...prev]);
    setView('Dashboard');
  };

  const NavItem: React.FC<{
    id: AppView;
    icon: React.ReactNode;
    label: string
  }> = ({ id, icon, label }) => {
    const isActive = view === id;
    return (
      <button
        onClick={() => setView(id)}
        className={`relative flex flex-col items-center justify-center w-16 h-12 transition-all duration-300 ${isActive ? 'text-[#1a1a1a]' : 'text-gray-400 hover:text-gray-600'
          }`}
      >
        {icon}
        <span className="text-[10px] font-bold tracking-widest mt-1 uppercase">
          {label}
        </span>
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            className="absolute inset-0 bg-white/40 -z-10 rounded-xl"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
      </button>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass px-8 py-6 rounded-3xl">
          <p className="text-gray-600 text-sm uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!user) {
    return <Landing />;
  }

  // Show language setup if onboarding not complete
  if (profile && !profile.onboarding_complete) {
    return (
      <LanguageSetup
        userId={user.id}
        onComplete={() => window.location.reload()}
      />
    );
  }

  // Show main app if authenticated and onboarding complete
  return (
    <div className="min-h-screen relative flex flex-col items-center">
      {/* Universal Background Blur for Study Mode */}
      <AnimatePresence>
        {view === 'Study' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#F6F7F9]/95 backdrop-blur-3xl z-40"
          />
        )}
      </AnimatePresence>

      {/* Main Content Area - Added relative z-50 to ensure it stays above the blur */}
      <main className="w-full max-w-6xl px-6 py-12 pb-32 relative z-50">
        <AnimatePresence mode="wait">
          {view === 'Dashboard' && (
            <motion.div
              key="dash"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.4 }}
            >
              <Dashboard decks={decks} onStartDeck={startStudy} onAddDeck={handleAddDeck} isLoading={loadingDecks} />
            </motion.div>
          )}

          {view === 'Study' && activeDeck && (
            <motion.div
              key="study"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex justify-center items-center min-h-[70vh]"
            >
              <StudyMode deck={activeDeck} onExit={() => setView('Dashboard')} />
            </motion.div>
          )}

          {view === 'Explore' && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Explore onAddDeck={handleAddDeck} />
            </motion.div>
          )}

          {view === 'Profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Profile />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Island Navigation */}
      {view !== 'Study' && (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-[32px] shadow-2xl z-50 flex gap-4">
          <NavItem id="Dashboard" icon={<LayoutDashboard size={20} />} label="Hub" />
          <NavItem id="Explore" icon={<Search size={20} />} label="Find" />
          <NavItem id="Profile" icon={<User size={20} />} label="Me" />
        </nav>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
