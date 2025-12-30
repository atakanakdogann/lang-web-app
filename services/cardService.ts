import { supabase } from './supabaseClient';
import type { DBCard, UserProgress } from '../types';

export const cardService = {
    /**
     * Get all cards for a specific deck
     */
    async getCardsForDeck(deckId: string): Promise<DBCard[]> {
        const { data, error } = await supabase
            .from('cards')
            .select('*')
            .eq('deck_id', deckId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Create a new card
     */
    async createCard(card: Omit<DBCard, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('cards')
            .insert(card)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create multiple cards at once (bulk insert)
     */
    async createCards(cards: Omit<DBCard, 'id' | 'created_at'>[]) {
        const { data, error } = await supabase
            .from('cards')
            .insert(cards)
            .select();

        if (error) throw error;
        return data;
    },

    /**
     * Get user's progress for a specific card
     */
    async getCardProgress(userId: string, cardId: string): Promise<UserProgress | null> {
        const { data, error } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('card_id', cardId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
        return data;
    },

    /**
     * Update user's progress on a card (spaced repetition)
     */
    async updateCardProgress(userId: string, cardId: string, quality: number) {
        // Check if progress record exists
        const existing = await this.getCardProgress(userId, cardId);

        // Calculate next review date based on SM-2 algorithm (simplified)
        const calculateNextReview = (currentBox: number, quality: number): { box: number; nextReview: Date } => {
            let newBox = currentBox;

            if (quality >= 4) {
                newBox = Math.min(currentBox + 1, 5); // Promote to next box
            } else if (quality < 3) {
                newBox = 1; // Reset to first box
            }

            const intervals = [1, 3, 7, 14, 30]; // Days until next review
            const days = intervals[newBox - 1] || 30;
            const nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + days);

            return { box: newBox, nextReview };
        };

        const currentBox = existing?.box || 1;
        const { box, nextReview } = calculateNextReview(currentBox, quality);

        if (existing) {
            // Update existing progress
            const { data, error } = await supabase
                .from('user_progress')
                .update({
                    box,
                    next_review: nextReview.toISOString(),
                    last_quality: quality,
                })
                .eq('user_id', userId)
                .eq('card_id', cardId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Create new progress record
            const { data, error } = await supabase
                .from('user_progress')
                .insert({
                    user_id: userId,
                    card_id: cardId,
                    box,
                    next_review: nextReview.toISOString(),
                    last_quality: quality,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    /**
     * Get cards due for review (spaced repetition)
     */
    async getDueCards(userId: string, deckId: string): Promise<DBCard[]> {
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('cards')
            .select(`
        *,
        user_progress!inner(*)
      `)
            .eq('deck_id', deckId)
            .eq('user_progress.user_id', userId)
            .lte('user_progress.next_review', now);

        if (error) throw error;
        return data || [];
    },
};
