import { supabase } from './supabaseClient';

export interface CardProgress {
    cardId: string;
    rating: number;
    studiedAt: string;
}

export interface DeckProgress {
    deckId: string;
    cardsStudied: number;
    totalCards: number;
    averageRating: number;
    progress: number; // percentage
}

export const progressService = {
    // Save or update a card's rating
    async saveCardRating(userId: string, cardId: string, rating: number): Promise<void> {
        const { error } = await supabase
            .from('user_progress')
            .upsert({
                user_id: userId,
                card_id: cardId,
                rating: rating,
                studied_at: new Date().toISOString(),
                last_quality: Math.round(rating), // Keep integer version for compatibility
            }, {
                onConflict: 'user_id,card_id'
            });

        if (error) {
            console.error('Error saving card rating:', error);
            throw error;
        }
    },

    // Get progress for a specific deck
    async getDeckProgress(userId: string, deckId: string): Promise<DeckProgress | null> {
        // First get all card IDs for this deck
        const { data: cards, error: cardsError } = await supabase
            .from('cards')
            .select('id')
            .eq('deck_id', deckId);

        if (cardsError || !cards) {
            console.error('Error fetching deck cards:', cardsError);
            return null;
        }

        const cardIds = cards.map(c => c.id);
        if (cardIds.length === 0) {
            return {
                deckId,
                cardsStudied: 0,
                totalCards: 0,
                averageRating: 0,
                progress: 0
            };
        }

        // Get progress for these cards
        const { data: progress, error: progressError } = await supabase
            .from('user_progress')
            .select('rating')
            .eq('user_id', userId)
            .in('card_id', cardIds);

        if (progressError) {
            console.error('Error fetching progress:', progressError);
            return null;
        }

        const cardsStudied = progress?.length || 0;
        const totalCards = cardIds.length;
        const ratings = progress?.filter(p => p.rating !== null).map(p => p.rating) || [];
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 0;

        return {
            deckId,
            cardsStudied,
            totalCards,
            averageRating,
            progress: totalCards > 0 ? Math.round((cardsStudied / totalCards) * 100) : 0
        };
    },

    // Get progress for all decks of a user
    async getAllDecksProgress(userId: string, deckIds: string[]): Promise<Map<string, DeckProgress>> {
        const progressMap = new Map<string, DeckProgress>();

        // Batch fetch all progress at once for efficiency
        const progressPromises = deckIds.map(deckId =>
            this.getDeckProgress(userId, deckId)
        );

        const results = await Promise.all(progressPromises);

        results.forEach((result, index) => {
            if (result) {
                progressMap.set(deckIds[index], result);
            }
        });

        return progressMap;
    }
};
