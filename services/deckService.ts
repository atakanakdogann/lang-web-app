import { supabase } from './supabaseClient';
import { deckStatsService } from './deckStatsService';
import type { DBDeck } from '../types';

export const deckService = {
    /**
     * Get all decks created by the current user
     */
    async getUserDecks(userId: string): Promise<DBDeck[]> {
        const { data, error } = await supabase
            .from('decks')
            .select('*')
            .eq('created_by', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Get all public decks (community and official) with creator info
     */
    /**
     * Get public decks with pagination
     */
    async getPublicDecks(limit: number = 20, page: number = 0): Promise<any[]> {
        const from = page * limit;
        const to = from + limit - 1;

        const { data, error } = await supabase
            .from('decks')
            .select(`
                *,
                profiles!created_by (
                    username,
                    avatar_url
                )
            `)
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;
        return data || [];
    },

    /**
     * Get specific decks by ID (for popular/top rated views)
     */
    async getDecksByIds(deckIds: string[]): Promise<any[]> {
        if (deckIds.length === 0) return [];

        const { data, error } = await supabase
            .from('decks')
            .select(`
                *,
                profiles!created_by (
                    username,
                    avatar_url
                )
            `)
            .in('id', deckIds);

        if (error) throw error;
        return data || [];
    },

    /**
     * Create a new deck
     */
    async createDeck(deck: Omit<DBDeck, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('decks')
            .insert(deck)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing deck
     */
    async updateDeck(deckId: string, updates: Partial<DBDeck>) {
        const { data, error } = await supabase
            .from('decks')
            .update(updates)
            .eq('id', deckId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a deck
     */
    async deleteDeck(deckId: string) {
        const { error } = await supabase
            .from('decks')
            .delete()
            .eq('id', deckId);

        if (error) throw error;
    },

    /**
     * Clone a public deck to user's library
     */
    async cloneDeck(sourceDeckId: string, userId: string) {
        // Get the source deck
        const { data: sourceDeck, error: deckError } = await supabase
            .from('decks')
            .select('*')
            .eq('id', sourceDeckId)
            .single();

        if (deckError) throw deckError;

        // Create new deck for user
        const { data: newDeck, error: createError } = await supabase
            .from('decks')
            .insert({
                created_by: userId,
                title: sourceDeck.title,
                source_lang: sourceDeck.source_lang,
                target_lang: sourceDeck.target_lang,
                level: sourceDeck.level,
                is_public: false,
                cover_gradient: sourceDeck.cover_gradient,
            })
            .select()
            .single();

        if (createError) throw createError;

        // Clone all cards from source deck
        const { data: sourceCards, error: cardsError } = await supabase
            .from('cards')
            .select('*')
            .eq('deck_id', sourceDeckId);

        if (cardsError) throw cardsError;

        if (sourceCards && sourceCards.length > 0) {
            const newCards = sourceCards.map(card => ({
                deck_id: newDeck.id,
                word: card.word,
                translation: card.translation,
                type: card.type,
                sample_sentence: card.sample_sentence,
                ai_context: card.ai_context,
            }));

            const { error: insertCardsError } = await supabase
                .from('cards')
                .insert(newCards);

            if (insertCardsError) throw insertCardsError;
        }

        // Increment clone count on original deck
        await deckStatsService.incrementCloneCount(sourceDeckId);

        return newDeck;
    },
};
