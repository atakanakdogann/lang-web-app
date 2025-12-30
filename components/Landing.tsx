import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Brain, TrendingUp, Globe, Users, ChevronRight } from 'lucide-react';
import SignUp from './SignUp';
import SignIn from './SignIn';

const Landing: React.FC = () => {
    const [showSignUp, setShowSignUp] = useState(false);
    const [showSignIn, setShowSignIn] = useState(false);

    const features = [
        {
            icon: <Brain className="text-purple-400" size={32} />,
            title: 'AI-Powered Learning',
            description: 'Generate custom decks with our intelligent AI or create your own from scratch',
        },
        {
            icon: <Zap className="text-yellow-400" size={32} />,
            title: 'Smart Practice',
            description: 'Fill-in-the-blank exercises with real-time AI feedback on your answers',
        },
        {
            icon: <TrendingUp className="text-green-400" size={32} />,
            title: 'Track Progress',
            description: 'Watch your language skills grow with detailed statistics and streaks',
        },
        {
            icon: <Users className="text-blue-400" size={32} />,
            title: 'Community Decks',
            description: 'Access thousands of public decks created by learners worldwide',
        },
    ];

    const stats = [
        { value: '10K+', label: 'Words Learned' },
        { value: '500+', label: 'Active Learners' },
        { value: '50+', label: 'Languages' },
        { value: '95%', label: 'Success Rate' },
    ];

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        rotate: [90, 0, 90],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"
                />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 px-6 py-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                            <Sparkles className="text-white" size={20} />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Aura
                        </span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowSignIn(true)}
                            className="px-6 py-2.5 rounded-full font-medium text-gray-700 hover:bg-white/50 transition-all"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setShowSignUp(true)}
                            className="px-6 py-2.5 rounded-full font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 px-6 pt-20 pb-32">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center max-w-4xl mx-auto"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6"
                        >
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium text-gray-700">Join 500+ learners worldwide</span>
                        </motion.div>

                        <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
                            Master Any Language
                            <br />
                            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                With AI Guidance
                            </span>
                        </h1>

                        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Learn smarter with AI-generated decks, intelligent feedback, and a global community.
                            Your personal language sanctuary awaits.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => setShowSignUp(true)}
                                className="group px-8 py-4 rounded-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-2xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                Start Learning Free
                                <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
                            </button>
                            <button className="px-8 py-4 rounded-2xl font-bold glass hover:bg-white/60 transition-all">
                                Watch Demo
                            </button>
                        </div>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
                    >
                        {stats.map((stat, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 + index * 0.1 }}
                                className="glass p-6 rounded-3xl text-center"
                            >
                                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                                    {stat.value}
                                </div>
                                <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="relative z-10 px-6 py-24 bg-white/40">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Everything You Need to Succeed</h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Powerful features designed to accelerate your language learning journey
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                viewport={{ once: true }}
                                whileHover={{ y: -4 }}
                                className="glass p-8 rounded-3xl hover:shadow-xl transition-all group"
                            >
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 px-6 py-24">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="glass-dark p-12 rounded-[40px] text-white"
                    >
                        <Globe className="mx-auto mb-6 text-blue-400" size={48} />
                        <h2 className="text-4xl font-bold mb-4">Ready to Begin Your Journey?</h2>
                        <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
                            Join thousands of learners mastering new languages with AI-powered tools and a supportive community.
                        </p>
                        <button
                            onClick={() => setShowSignUp(true)}
                            className="px-10 py-5 rounded-2xl font-bold bg-white text-gray-900 hover:shadow-2xl hover:shadow-white/20 transition-all inline-flex items-center gap-2"
                        >
                            Create Free Account
                            <ChevronRight size={20} />
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 px-6 py-12 border-t border-gray-200/50">
                <div className="max-w-7xl mx-auto text-center text-gray-600">
                    <p>© 2024 Aura. Made with ❤️ for language learners worldwide.</p>
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
