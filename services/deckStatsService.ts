import { supabase } from './supabaseClient';

export interface DeckStats {
    deckId: string;
    cloneCount: number;
    ratingSum: number;
    ratingCount: number;
    avgRating: number;
}

export const deckStatsService = {
    /**
     * Format clone count for display (10+, 50+, 500+, 1K+)
     */
    formatCloneCount(count: number): string | null {
        if (count < 10) return null;
        if (count < 50) return '10+';
        if (count < 100) return '50+';
        if (count < 500) return '100+';
        if (count < 1000) return '500+';
        if (count < 5000) return '1K+';
        if (count < 10000) return '5K+';
        return '10K+';
    },

    /**
     * Get stats for a single deck
     */
    async getDeckStats(deckId: string): Promise<DeckStats | null> {
        const { data, error } = await supabase
            .from('deck_stats')
            .select('*')
            .eq('deck_id', deckId)
            .single();

        if (error || !data) return null;

        return {
            deckId: data.deck_id,
            cloneCount: data.clone_count || 0,
            ratingSum: data.rating_sum || 0,
            ratingCount: data.rating_count || 0,
            avgRating: data.rating_count > 0 ? data.rating_sum / data.rating_count : 0,
        };
    },

    /**
     * Get stats for multiple decks (for Explore page)
     */
    async getMultipleDeckStats(deckIds: string[]): Promise<Map<string, DeckStats>> {
        const statsMap = new Map<string, DeckStats>();
        if (deckIds.length === 0) return statsMap;

        const { data, error } = await supabase
            .from('deck_stats')
            .select('*')
            .in('deck_id', deckIds);

        if (error || !data) return statsMap;

        data.forEach(d => {
            statsMap.set(d.deck_id, {
                deckId: d.deck_id,
                cloneCount: d.clone_count || 0,
                ratingSum: d.rating_sum || 0,
                ratingCount: d.rating_count || 0,
                avgRating: d.rating_count > 0 ? d.rating_sum / d.rating_count : 0,
            });
        });

        return statsMap;
    },

    /**
     * Initialize stats for a new public deck
     */
    async initializeDeckStats(deckId: string): Promise<void> {
        const { error } = await supabase
            .from('deck_stats')
            .upsert({ deck_id: deckId, clone_count: 0, rating_sum: 0, rating_count: 0 });

        if (error) console.error('Failed to initialize deck stats:', error);
    },

    /**
     * Increment clone count when a deck is cloned
     */
    async incrementCloneCount(deckId: string): Promise<void> {
        // First check if stats exist
        const existing = await this.getDeckStats(deckId);

        if (existing) {
            const { error } = await supabase
                .from('deck_stats')
                .update({ clone_count: existing.cloneCount + 1 })
                .eq('deck_id', deckId);

            if (error) console.error('Failed to increment clone count:', error);
        } else {
            // Initialize with 1 clone
            const { error } = await supabase
                .from('deck_stats')
                .insert({ deck_id: deckId, clone_count: 1, rating_sum: 0, rating_count: 0 });

            if (error) console.error('Failed to create deck stats:', error);
        }
    },

    /**
     * Rate a deck (1-5 stars)
     */
    async rateDeck(deckId: string, userId: string, rating: number): Promise<boolean> {
        if (rating < 1 || rating > 5) return false;

        try {
            // Check for existing rating
            const { data: existing } = await supabase
                .from('deck_ratings')
                .select('rating')
                .eq('deck_id', deckId)
                .eq('user_id', userId)
                .single();

            const oldRating = existing?.rating || 0;

            // Upsert the rating
            const { error: ratingError } = await supabase
                .from('deck_ratings')
                .upsert({
                    deck_id: deckId,
                    user_id: userId,
                    rating,
                    created_at: new Date().toISOString()
                }, { onConflict: 'deck_id,user_id' });

            if (ratingError) throw ratingError;

            // Update deck_stats
            const stats = await this.getDeckStats(deckId);

            if (stats) {
                // Update existing stats
                const newSum = stats.ratingSum - oldRating + rating;
                const newCount = existing ? stats.ratingCount : stats.ratingCount + 1;

                const { error } = await supabase
                    .from('deck_stats')
                    .update({ rating_sum: newSum, rating_count: newCount })
                    .eq('deck_id', deckId);

                if (error) throw error;
            } else {
                // Create new stats entry
                const { error } = await supabase
                    .from('deck_stats')
                    .insert({ deck_id: deckId, clone_count: 0, rating_sum: rating, rating_count: 1 });

                if (error) throw error;
            }

            return true;
        } catch (error) {
            console.error('Failed to rate deck:', error);
            return false;
        }
    },

    /**
     * Get user's rating for a deck (if exists)
     */
    async getUserRating(deckId: string, userId: string): Promise<number | null> {
        const { data, error } = await supabase
            .from('deck_ratings')
            .select('rating')
            .eq('deck_id', deckId)
            .eq('user_id', userId)
            .single();

        if (error || !data) return null;
        return data.rating;
    },

    /**
     * Get popular decks (by clone count)
     */
    async getPopularDecks(limit: number = 20): Promise<string[]> {
        const { data, error } = await supabase
            .from('deck_stats')
            .select('deck_id')
            .order('clone_count', { ascending: false })
            .limit(limit);

        if (error || !data) return [];
        return data.map(d => d.deck_id);
    },

    /**
     * Get top rated decks
     */
    async getTopRatedDecks(limit: number = 20): Promise<string[]> {
        const { data, error } = await supabase
            .from('deck_stats')
            .select('deck_id, rating_sum, rating_count')
            .gt('rating_count', 0)
            .order('rating_count', { ascending: false })
            .limit(limit);

        if (error || !data) return [];

        // Sort by average rating
        return data
            .map(d => ({ id: d.deck_id, avg: d.rating_sum / d.rating_count }))
            .sort((a, b) => b.avg - a.avg)
            .map(d => d.id);
    },
};
