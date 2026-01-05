import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Flame, Trophy, Star, Zap } from 'lucide-react';
import { questService, Quest } from '../services/questService';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../services/i18n';

interface QuestsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const QuestsPanel: React.FC<QuestsPanelProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && user) {
            loadQuests();
        }
    }, [isOpen, user]);

    const loadQuests = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const questData = await questService.getQuests(user.id);
            setQuests(questData);
        } catch (error) {
            console.error('Failed to load quests:', error);
        } finally {
            setLoading(false);
        }
    };

    const dailyQuests = quests.filter(q => q.type === 'daily');
    const weeklyQuests = quests.filter(q => q.type === 'weekly');
    const totalXP = questService.calculateTotalXP(quests);
    const completedCount = quests.filter(q => q.completed).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <Target size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">{t('quests.title')}</h2>
                                        <p className="text-white/80 text-sm">{completedCount}/{quests.length} {t('quests.completed')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* XP Summary */}
                            <div className="bg-white/20 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap size={20} className="text-yellow-300" />
                                    <span className="font-bold">{totalXP} XP {t('quests.earned')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Flame size={16} />
                                    <span className="text-sm">{t('quests.today')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
                                </div>
                            ) : (
                                <>
                                    {/* Daily Quests */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Flame size={20} className="text-orange-500" />
                                            <h3 className="font-bold text-gray-800">{t('quests.daily')}</h3>
                                            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
                                                {t('quests.resets_midnight')}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            {dailyQuests.map(quest => (
                                                <QuestCard key={quest.id} quest={quest} />
                                            ))}
                                        </div>
                                    </section>

                                    {/* Weekly Quests */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Trophy size={20} className="text-purple-500" />
                                            <h3 className="font-bold text-gray-800">{t('quests.weekly')}</h3>
                                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-medium">
                                                {t('quests.resets_monday')}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            {weeklyQuests.map(quest => (
                                                <QuestCard key={quest.id} quest={quest} />
                                            ))}
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// Individual Quest Card
const QuestCard: React.FC<{ quest: Quest }> = ({ quest }) => {
    const progress = Math.min((quest.current / quest.target) * 100, 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border-2 transition-all ${quest.completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className={`font-bold ${quest.completed ? 'text-green-600' : 'text-gray-800'}`}>
                            {quest.title}
                        </h4>
                        {quest.completed && (
                            <span className="text-green-500">✓</span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500">{quest.description}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${quest.completed ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                    <Star size={14} />
                    <span className="text-xs font-bold">{quest.xp} XP</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="relative">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-full ${quest.completed
                                ? 'bg-green-500'
                                : quest.type === 'daily'
                                    ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                                    : 'bg-gradient-to-r from-purple-400 to-purple-500'
                            }`}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-400">{quest.current}/{quest.target}</span>
                    <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
                </div>
            </div>
        </motion.div>
    );
};

export default QuestsPanel;
