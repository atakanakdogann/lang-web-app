
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Search,
  User,
  Plus,
  Target
} from 'lucide-react';
import { AppView, Deck } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { I18nProvider } from './services/i18n';
import { deckService } from './services/deckService';
import { cardService } from './services/cardService';
import { progressService } from './services/progressService';
import ErrorBoundary from './components/ErrorBoundary';
import { SkeletonDashboard, SkeletonExplore, SkeletonProfile } from './components/Skeleton';

// Lazy load heavy components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const StudyMode = lazy(() => import('./components/StudyMode'));
const Explore = lazy(() => import('./components/Explore'));
const Profile = lazy(() => import('./components/Profile'));
const Landing = lazy(() => import('./components/Landing'));
const LanguageSetup = lazy(() => import('./components/LanguageSetup'));
import LanguageSwitcher from './components/LanguageSwitcher';
import QuestsPanel from './components/QuestsPanel';

// Skeleton fallback components for each view
const ViewSkeleton: React.FC<{ view: AppView }> = ({ view }) => {
  switch (view) {
    case 'Dashboard':
      return <SkeletonDashboard />;
    case 'Explore':
      return <SkeletonExplore />;
    case 'Profile':
      return <SkeletonProfile />;
    default:
      return (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      );
  }
};

const MainApp: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const toast = useToast();
  const [view, setView] = useState<AppView>('Dashboard');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [questsOpen, setQuestsOpen] = useState(false);

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
              target_lang: dbDeck.target_lang,
              is_public: dbDeck.is_public,
              created_by: dbDeck.created_by,
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

  // Refresh progress for a specific deck (called when exiting study mode)
  const refreshDeckProgress = async (deckId: string) => {
    if (!user) return;

    try {
      const progressMap = await progressService.getAllDecksProgress(user.id, [deckId]);
      const progress = progressMap.get(deckId);

      if (progress) {
        setDecks(prev => prev.map(d => {
          if (d.id === deckId) {
            return {
              ...d,
              progress: progress.progress,
              averageRating: progress.averageRating,
              cardsStudied: progress.cardsStudied
            };
          }
          return d;
        }));
      }
    } catch (error) {
      console.error('Failed to refresh deck progress:', error);
    }
  };

  const startStudy = (deck: Deck) => {
    if (!deck.cards || deck.cards.length === 0) {
      toast.warning('Empty Deck', 'This deck has no cards. Try exploring or generating a custom one.');
      return;
    }
    setActiveDeck(deck);
    setView('Study');
  };

  const handleAddDeck = (newDeck: Deck) => {
    setDecks(prev => [newDeck, ...prev]);
    setView('Dashboard');
  };

  const handleDeckDeleted = (deckId: string) => {
    setDecks(prev => prev.filter(d => d.id !== deckId));
    setActiveDeck(null);
  };

  const handleDeckRegenerated = (newDeck: Deck) => {
    setDecks(prev => prev.map(d => d.id === newDeck.id ? newDeck : d));
    setActiveDeck(newDeck);
  };

  // Handle exiting study mode - refresh progress
  const handleExitStudy = () => {
    if (activeDeck) {
      refreshDeckProgress(activeDeck.id);
    }
    setActiveDeck(null);
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
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }>
        <Landing />
      </Suspense>
    );
  }

  // Show language setup if onboarding not complete
  if (profile && !profile.onboarding_complete) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full" />
        </div>
      }>
        <LanguageSetup
          userId={user.id}
          onComplete={() => window.location.reload()}
        />
      </Suspense>
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

      {/* Top Right Controls - Quests & Language Switcher */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        {/* Quests Button */}
        <button
          onClick={() => setQuestsOpen(true)}
          className="relative p-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <Target size={20} />
        </button>
        <LanguageSwitcher />
      </div>

      {/* Quests Panel */}
      <QuestsPanel isOpen={questsOpen} onClose={() => setQuestsOpen(false)} />

      {/* Main Content Area - Added relative z-50 to ensure it stays above the blur */}
      <main className="w-full max-w-6xl px-6 py-12 pb-32 relative z-40">
        <AnimatePresence mode="wait">
          {view === 'Dashboard' && (
            <motion.div
              key="dash"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.4 }}
            >
              <Suspense fallback={<SkeletonDashboard />}>
                <Dashboard decks={decks} onStartDeck={startStudy} onAddDeck={handleAddDeck} isLoading={loadingDecks} />
              </Suspense>
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
              <Suspense fallback={<ViewSkeleton view="Study" />}>
                <StudyMode
                  deck={activeDeck}
                  onExit={handleExitStudy}
                  onDeckDeleted={handleDeckDeleted}
                  onDeckRegenerated={handleDeckRegenerated}
                />
              </Suspense>
            </motion.div>
          )}

          {view === 'Explore' && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Suspense fallback={<SkeletonExplore />}>
                <Explore onAddDeck={handleAddDeck} />
              </Suspense>
            </motion.div>
          )}

          {view === 'Profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Suspense fallback={<SkeletonProfile />}>
                <Profile />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Island Navigation */}
      {view !== 'Study' && (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-[32px] shadow-2xl z-50 flex gap-4">
          <NavItem id="Dashboard" icon={<LayoutDashboard size={20} />} label="Hub" />
          <NavItem id="Explore" icon={<Search size={20} />} label="Explore" />
          <NavItem id="Profile" icon={<User size={20} />} label="Me" />
        </nav>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
};

export default App;
