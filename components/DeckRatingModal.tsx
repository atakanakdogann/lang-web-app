import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Send } from 'lucide-react';
import { deckStatsService } from '../services/deckStatsService';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../services/i18n';

interface DeckRatingModalProps {
    isOpen: boolean;
    deckId: string;
    deckTitle: string;
    onClose: () => void;
    onRated: () => void;
}

const DeckRatingModal: React.FC<DeckRatingModalProps> = ({
    isOpen,
    deckId,
    deckTitle,
    onClose,
    onRated,
}) => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (!user || rating === 0) return;

        setIsSubmitting(true);
        try {
            const success = await deckStatsService.rateDeck(deckId, user.id, rating);
            if (success) {
                setSubmitted(true);
                setTimeout(() => {
                    onRated();
                    onClose();
                }, 1500);
            }
        } catch (error) {
            console.error('Rating error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayRating = hoveredRating || rating;

    const getRatingText = (r: number) => {
        switch (r) {
            case 1: return t('rating.terrible');
            case 2: return t('rating.poor');
            case 3: return t('rating.okay');
            case 4: return t('rating.good');
            case 5: return t('rating.excellent');
            default: return t('rating.tap_to_rate');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl text-center"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {submitted ? (
                            // Success State
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-8"
                            >
                                <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: 'spring' }}
                                    >
                                        <Star className="text-green-500" size={40} fill="currentColor" />
                                    </motion.div>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('rating.thank_you')}</h3>
                                <p className="text-gray-500">{t('rating.feedback_helps')}</p>
                            </motion.div>
                        ) : (
                            // Rating State
                            <>
                                <div className="mb-6">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
                                        <Star className="text-white" size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{t('rating.how_was')}</h3>
                                    <p className="text-gray-500 text-sm">"{deckTitle}"</p>
                                </div>

                                {/* Stars */}
                                <div className="flex justify-center gap-2 mb-4">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoveredRating(star)}
                                            onMouseLeave={() => setHoveredRating(0)}
                                            className="p-1 transition-transform hover:scale-110 active:scale-95"
                                        >
                                            <Star
                                                size={40}
                                                className={`transition-colors ${star <= displayRating
                                                        ? 'text-yellow-400 fill-yellow-400'
                                                        : 'text-gray-200'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>

                                {/* Rating Text */}
                                <p className={`text-sm font-medium mb-6 h-5 transition-colors ${displayRating > 0 ? 'text-gray-700' : 'text-gray-400'
                                    }`}>
                                    {getRatingText(displayRating)}
                                </p>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        {t('rating.skip')}
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={rating === 0 || isSubmitting}
                                        className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Send size={18} />
                                        {isSubmitting ? t('rating.submitting') : t('rating.submit')}
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DeckRatingModal;
