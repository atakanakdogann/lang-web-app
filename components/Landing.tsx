import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Brain, TrendingUp, Users, ChevronRight, ChevronLeft, BookOpen, MessageCircle } from 'lucide-react';
import SignUp from './SignUp';
import SignIn from './SignIn';

const Landing: React.FC = () => {
    const [showSignUp, setShowSignUp] = useState(false);
    const [showSignIn, setShowSignIn] = useState(false);
    const [activeFeature, setActiveFeature] = useState(0);

    const features = [
        {
            icon: <Brain className="text-purple-500" size={24} />,
            title: 'AI-Powered Decks',
            description: 'Describe any topic and let AI create custom flashcard decks instantly.',
            gradient: 'from-purple-500/20 to-pink-500/20',
        },
        {
            icon: <MessageCircle className="text-blue-500" size={24} />,
            title: 'Smart Practice',
            description: 'Fill-in-the-blank exercises with real-time AI feedback.',
            gradient: 'from-blue-500/20 to-cyan-500/20',
        },
        {
            icon: <BookOpen className="text-green-500" size={24} />,
            title: 'Manual Decks',
            description: 'Build your own decks with full control over content.',
            gradient: 'from-green-500/20 to-emerald-500/20',
        },
        {
            icon: <Users className="text-orange-500" size={24} />,
            title: 'Community Library',
            description: 'Explore decks shared by learners worldwide.',
            gradient: 'from-orange-500/20 to-amber-500/20',
        },
        {
            icon: <TrendingUp className="text-rose-500" size={24} />,
            title: 'Track Progress',
            description: 'Monitor streaks, words mastered, and weekly activity.',
            gradient: 'from-rose-500/20 to-red-500/20',
        },
    ];

    // Auto-rotate features
    useEffect(() => {
        const timer = setInterval(() => {
            setActiveFeature((prev) => (prev + 1) % features.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    const nextFeature = () => setActiveFeature((prev) => (prev + 1) % features.length);
    const prevFeature = () => setActiveFeature((prev) => (prev - 1 + features.length) % features.length);

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/50">
            {/* Subtle Animated Background */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <motion.div
                    animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/40 to-purple-100/40 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ x: [0, -80, 0], y: [0, 60, 0] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-pink-100/40 to-orange-100/40 rounded-full blur-3xl"
                />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 px-6 py-4">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <Sparkles className="text-white" size={18} />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                            Claus
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowSignIn(true)}
                            className="px-4 py-2 rounded-xl font-medium text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-all text-sm"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setShowSignUp(true)}
                            className="px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all text-sm"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-col justify-center px-6 pb-6">
                <div className="max-w-4xl mx-auto w-full">
                    {/* Hero Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-10"
                    >
                        <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-white/50 px-3 py-1.5 rounded-full mb-5 shadow-sm">
                            <Zap className="text-yellow-500" size={14} />
                            <span className="text-xs font-medium text-gray-700">AI-Powered Language Learning</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight text-gray-900">
                            Learn Languages{' '}
                            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                The Smart Way
                            </span>
                        </h1>

                        <p className="text-base text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                            Create flashcard decks with AI, practice sentences with instant feedback, and track your progress.
                        </p>

                        <button
                            onClick={() => setShowSignUp(true)}
                            className="group px-6 py-3 rounded-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-xl hover:shadow-blue-500/25 transition-all inline-flex items-center gap-2"
                        >
                            Start Learning Free
                            <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />
                        </button>
                    </motion.div>

                    {/* Feature Carousel */}
                    <div className="max-w-xl mx-auto">
                        <h2 className="text-base font-bold text-gray-800 text-center mb-4">What Makes Claus Special</h2>

                        {/* Feature Card with Inline Arrows */}
                        <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm border border-white/60 rounded-2xl shadow-lg overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeFeature}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`bg-gradient-to-br ${features[activeFeature].gradient} p-5`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Left Arrow */}
                                        <button
                                            onClick={prevFeature}
                                            className="w-8 h-8 bg-white/80 rounded-full shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white transition-all flex-shrink-0"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>

                                        {/* Content */}
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                                                {features[activeFeature].icon}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-base font-bold text-gray-900">
                                                    {features[activeFeature].title}
                                                </h3>
                                                <p className="text-gray-600 text-sm leading-snug">
                                                    {features[activeFeature].description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Arrow */}
                                        <button
                                            onClick={nextFeature}
                                            className="w-8 h-8 bg-white/80 rounded-full shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white transition-all flex-shrink-0"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Dots Indicator */}
                            <div className="flex justify-center gap-1.5 py-3 bg-white/50">
                                {features.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActiveFeature(index)}
                                        className={`h-1.5 rounded-full transition-all ${index === activeFeature
                                            ? 'bg-blue-500 w-5'
                                            : 'bg-gray-300 hover:bg-gray-400 w-1.5'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 px-6 py-4">
                <div className="max-w-4xl mx-auto text-center text-gray-400 text-xs">
                    <p>© 2025 Claus. Made with ❤️ for language learners.</p>
                </div>
            </footer>

            {/* Auth Modals */}
            <AnimatePresence>
                {showSignUp && (
                    <SignUp
                        onClose={() => setShowSignUp(false)}
                        onSwitchToSignIn={() => {
                            setShowSignUp(false);
                            setShowSignIn(true);
                        }}
                    />
                )}
                {showSignIn && (
                    <SignIn
                        onClose={() => setShowSignIn(false)}
                        onSwitchToSignUp={() => {
                            setShowSignIn(false);
                            setShowSignUp(true);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Landing;
