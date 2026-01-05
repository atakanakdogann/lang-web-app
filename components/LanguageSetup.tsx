import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Globe, BookOpen, Target, Sparkles, Heart } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useTranslation } from '../services/i18n';

interface LanguageSetupProps {
    userId: string;
    onComplete: () => void;
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

const LEVELS = [
    { code: 'A1', name: 'Beginner', description: 'Basic phrases, greetings, introductions', color: 'from-green-400 to-green-600' },
    { code: 'A2', name: 'Elementary', description: 'Simple conversations about daily topics', color: 'from-green-500 to-teal-500' },
    { code: 'B1', name: 'Intermediate', description: 'Main ideas, travel, personal experiences', color: 'from-blue-400 to-blue-600' },
    { code: 'B2', name: 'Upper-Intermediate', description: 'Complex texts, fluent conversations', color: 'from-blue-500 to-purple-500' },
    { code: 'C1', name: 'Advanced', description: 'Flexible use, professional contexts', color: 'from-purple-400 to-purple-600' },
    { code: 'C2', name: 'Mastery', description: 'Near-native fluency in all situations', color: 'from-purple-500 to-pink-500' },
];

const INTERESTS = [
    { id: 'travel', emoji: '✈️', name: 'Travel' },
    { id: 'food', emoji: '🍕', name: 'Food & Cooking' },
    { id: 'tech', emoji: '💻', name: 'Technology' },
    { id: 'sports', emoji: '⚽', name: 'Sports' },
    { id: 'music', emoji: '🎵', name: 'Music' },
    { id: 'movies', emoji: '🎬', name: 'Movies & TV' },
    { id: 'business', emoji: '💼', name: 'Business' },
    { id: 'science', emoji: '🔬', name: 'Science' },
    { id: 'art', emoji: '🎨', name: 'Art & Design' },
    { id: 'fashion', emoji: '👗', name: 'Fashion' },
    { id: 'gaming', emoji: '🎮', name: 'Gaming' },
    { id: 'health', emoji: '🏥', name: 'Health & Fitness' },
    { id: 'nature', emoji: '🌿', name: 'Nature' },
    { id: 'books', emoji: '📚', name: 'Books & Reading' },
    { id: 'social', emoji: '💬', name: 'Social & Culture' },
];

const LanguageSetup: React.FC<LanguageSetupProps> = ({ userId, onComplete }) => {
    const { t, setLanguage } = useTranslation();
    const [step, setStep] = useState(1);
    const [nativeLang, setNativeLang] = useState('');
    const [targetLang, setTargetLang] = useState('');
    const [level, setLevel] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Toggle interest selection
    const toggleInterest = (interestId: string) => {
        setInterests(prev =>
            prev.includes(interestId)
                ? prev.filter(id => id !== interestId)
                : [...prev, interestId]
        );
    };

    // Handle native language selection - apply translation immediately
    const handleNativeLangSelect = (langCode: string) => {
        setNativeLang(langCode);
        // Apply translation immediately if language is supported (en or tr)
        if (langCode === 'en' || langCode === 'tr') {
            setLanguage(langCode);
        }
    };

    const handleComplete = async () => {
        if (!nativeLang || !targetLang || !level || interests.length < 4) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    native_lang: nativeLang,
                    target_lang: targetLang,
                    proficiency_level: level,
                    interests: interests,
                    onboarding_complete: true,
                })
                .eq('id', userId);

            if (error) throw error;
            onComplete();
        } catch (error) {
            console.error('Error saving language preferences:', error);
            alert('Failed to save preferences. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const getSelectedNativeLang = () => LANGUAGES.find(l => l.code === nativeLang);
    const getSelectedTargetLang = () => LANGUAGES.find(l => l.code === targetLang);

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6 z-50">
            {/* Animated Background */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"
            />
            <motion.div
                animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative glass p-10 rounded-[48px] w-full max-w-2xl shadow-2xl"
            >
                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={`flex-1 h-2 rounded-full transition-all ${s <= step ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-200'
                                }`}
                        />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* Step 1: Native Language */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <Globe className="text-white" size={32} />
                                </div>
                                <h2 className="text-3xl font-bold mb-2">{t('onboarding.native_title')}</h2>
                                <p className="text-gray-500">{t('onboarding.native_subtitle')}</p>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleNativeLangSelect(lang.code)}
                                        className={`p-4 rounded-2xl border-2 transition-all hover:scale-105 ${nativeLang === lang.code
                                            ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className="text-3xl block mb-1">{lang.flag}</span>
                                        <span className="text-sm font-medium">{lang.name}</span>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!nativeLang}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('onboarding.continue')}
                                <ChevronRight size={20} />
                            </button>
                        </motion.div>
                    )}

                    {/* Step 2: Target Language */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <Target className="text-white" size={32} />
                                </div>
                                <h2 className="text-3xl font-bold mb-2">{t('onboarding.target_title')}</h2>
                                <p className="text-gray-500">
                                    {t('onboarding.target_subtitle')} {getSelectedNativeLang()?.flag} {getSelectedNativeLang()?.name}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {LANGUAGES.filter(l => l.code !== nativeLang).map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setTargetLang(lang.code)}
                                        className={`p-4 rounded-2xl border-2 transition-all hover:scale-105 ${targetLang === lang.code
                                            ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/20'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className="text-3xl block mb-1">{lang.flag}</span>
                                        <span className="text-sm font-medium">{lang.name}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-6 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-100 transition-all"
                                >
                                    <ChevronLeft size={20} />
                                    {t('onboarding.back')}
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!targetLang}
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('onboarding.continue')}
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Proficiency Level */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <BookOpen className="text-white" size={32} />
                                </div>
                                <h2 className="text-3xl font-bold mb-2">
                                    {t('onboarding.level_title')}
                                </h2>
                                <p className="text-gray-500">
                                    {getSelectedNativeLang()?.flag} → {getSelectedTargetLang()?.flag} {t('onboarding.level_subtitle')}
                                </p>
                            </div>

                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                                {LEVELS.map((lvl) => (
                                    <button
                                        key={lvl.code}
                                        onClick={() => setLevel(lvl.code)}
                                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ${level === lvl.code
                                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${lvl.color} flex items-center justify-center text-white font-bold`}>
                                                {lvl.code}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-lg">{lvl.name}</div>
                                                <div className="text-sm text-gray-500">{lvl.description}</div>
                                            </div>
                                            {level === lvl.code && (
                                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <Sparkles className="text-white" size={14} />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(2)}
                                    className="px-6 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-100 transition-all"
                                >
                                    <ChevronLeft size={20} />
                                    {t('onboarding.back')}
                                </button>
                                <button
                                    onClick={() => setStep(4)}
                                    disabled={!level}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('onboarding.continue')}
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4: Interests */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <Heart className="text-white" size={32} />
                                </div>
                                <h2 className="text-3xl font-bold mb-2">{t('onboarding.interests_title')}</h2>
                                <p className="text-gray-500">
                                    {t('onboarding.interests_subtitle')} <span className="font-semibold text-blue-500">({interests.length}/4 {t('onboarding.minimum')})</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-h-[35vh] overflow-y-auto pr-2">
                                {INTERESTS.map((interest) => (
                                    <button
                                        key={interest.id}
                                        onClick={() => toggleInterest(interest.id)}
                                        className={`p-4 rounded-2xl border-2 transition-all hover:scale-105 text-center ${interests.includes(interest.id)
                                            ? 'border-pink-500 bg-pink-50 shadow-lg shadow-pink-500/20'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className="text-2xl block mb-1">{interest.emoji}</span>
                                        <span className="text-xs font-medium">{interest.name}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(3)}
                                    className="px-6 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-100 transition-all"
                                >
                                    <ChevronLeft size={20} />
                                    {t('onboarding.back')}
                                </button>
                                <button
                                    onClick={handleComplete}
                                    disabled={interests.length < 4 || isSaving}
                                    className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? (
                                        t('onboarding.saving')
                                    ) : (
                                        <>
                                            {t('onboarding.start_learning')}
                                            <Sparkles size={20} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default LanguageSetup;
