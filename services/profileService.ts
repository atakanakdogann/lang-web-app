import { supabase } from './supabaseClient';

export interface UserStats {
    totalWordsLearned: number;
    totalDecksCompleted: number;
    averageRating: number;
    currentStreak: number;
    longestStreak: number;
    totalCardsStudied: number;
    practiceHistory: { date: string; count: number }[];
}

export const profileService = {
    /**
     * Get user's learning statistics from the database
     */
    async getUserStats(userId: string): Promise<UserStats> {
        try {
            // Get all user's deck progress (for practice history and ratings)
            const { data: progressData, error: progressError } = await supabase
                .from('user_progress')
                .select('rating, created_at')
                .eq('user_id', userId);

            if (progressError) throw progressError;

            // Get user's decks count
            const { data: decksData, error: decksError } = await supabase
                .from('decks')
                .select('id')
                .eq('created_by', userId);

            if (decksError) throw decksError;

            // Get profile for streak info and cumulative word count
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('streak_days, daily_cards_studied, last_practice_date, total_words_learned')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            // Calculate stats
            const totalCardsStudied = progressData?.length || 0;
            const totalDecksCompleted = decksData?.length || 0;

            // Calculate average rating
            const ratings = progressData?.filter(p => p.rating !== null).map(p => p.rating) || [];
            const averageRating = ratings.length > 0
                ? ratings.reduce((a, b) => a + b, 0) / ratings.length
                : 0;

            // Generate practice history from progress data (last 6 months)
            const practiceHistory = this.generatePracticeHistory(progressData || []);

            return {
                // Use cumulative count from profile, never decreases
                totalWordsLearned: profileData?.total_words_learned || 0,
                totalDecksCompleted,
                averageRating: Math.round(averageRating * 10) / 10,
                currentStreak: profileData?.streak_days || 0,
                longestStreak: profileData?.streak_days || 0,
                totalCardsStudied,
                practiceHistory,
            };
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return {
                totalWordsLearned: 0,
                totalDecksCompleted: 0,
                averageRating: 0,
                currentStreak: 0,
                longestStreak: 0,
                totalCardsStudied: 0,
                practiceHistory: [],
            };
        }
    },

    /**
     * Generate practice history from progress data
     */
    generatePracticeHistory(progressData: { rating: number; created_at: string }[]): { date: string; count: number }[] {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const history: Record<string, number> = {};

        // Initialize all days to 0
        const current = new Date(sixMonthsAgo);
        while (current <= new Date()) {
            const dateStr = current.toISOString().split('T')[0];
            history[dateStr] = 0;
            current.setDate(current.getDate() + 1);
        }

        // Count cards per day
        progressData.forEach(p => {
            if (p.created_at) {
                const dateStr = p.created_at.split('T')[0];
                if (history[dateStr] !== undefined) {
                    history[dateStr]++;
                }
            }
        });

        return Object.entries(history).map(([date, count]) => ({ date, count }));
    },

    /**
     * Delete user account and all associated data
     */
    async deleteAccount(userId: string): Promise<void> {
        // Delete in order: progress -> cards -> decks -> profile -> auth user

        // 1. Delete user progress
        await supabase.from('user_progress').delete().eq('user_id', userId);

        // 2. Get user's decks to delete their cards
        const { data: userDecks } = await supabase
            .from('decks')
            .select('id')
            .eq('created_by', userId);

        if (userDecks) {
            for (const deck of userDecks) {
                await supabase.from('cards').delete().eq('deck_id', deck.id);
            }
        }

        // 3. Delete user's decks
        await supabase.from('decks').delete().eq('created_by', userId);

        // 4. Delete profile
        await supabase.from('profiles').delete().eq('id', userId);

        // 5. Delete auth user (this will sign them out)
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) {
            // If admin delete fails, try regular signout
            await supabase.auth.signOut();
        }
    },

    /**
     * Update user's language settings
     */
    async updateLanguageSettings(userId: string, nativeLang: string, targetLang: string, level: string): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({
                native_lang: nativeLang,
                target_lang: targetLang,
                proficiency_level: level,
            })
            .eq('id', userId);

        if (error) throw error;
    },

    /**
     * Update interests
     */
    async updateInterests(userId: string, interests: string[]): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ interests })
            .eq('id', userId);

        if (error) throw error;
    },

    /**
     * Increment total words learned (cumulative, never decreases)
     */
    async incrementWordsLearned(userId: string, count: number = 1): Promise<void> {
        try {
            // First get current count
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('total_words_learned')
                .eq('id', userId)
                .single();

            if (fetchError) throw fetchError;

            const currentCount = profile?.total_words_learned || 0;
            const newCount = currentCount + count;

            // Update with new count
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ total_words_learned: newCount })
                .eq('id', userId);

            if (updateError) throw updateError;
        } catch (error) {
            console.error('Error incrementing words learned:', error);
        }
    },

    /**
     * Update streak when user studies
     * Called when a card is completed - updates streak based on last practice date
     */
    async updateStreak(userId: string): Promise<void> {
        try {
            // Get current streak info
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('streak_days, last_practice_date')
                .eq('id', userId)
                .single();

            if (fetchError) throw fetchError;

            const today = new Date().toISOString().split('T')[0];
            const lastPractice = profile?.last_practice_date?.split('T')[0];
            const currentStreak = profile?.streak_days || 0;

            // If already practiced today AND streak is not 0, no update needed
            if (lastPractice === today && currentStreak > 0) {
                return;
            }

            // If practiced today but streak is 0, fix it to 1
            if (lastPractice === today && currentStreak === 0) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ streak_days: 1 })
                    .eq('id', userId);
                if (updateError) throw updateError;
                return;
            }

            let newStreak = 1; // Default: start new streak

            if (lastPractice) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                if (lastPractice === yesterdayStr) {
                    // Practiced yesterday, continue streak
                    newStreak = currentStreak + 1;
                }
                // If last practice was before yesterday, streak resets to 1
            }

            // Update profile with new streak and last practice date
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    streak_days: newStreak,
                    last_practice_date: today
                })
                .eq('id', userId);

            if (updateError) throw updateError;
        } catch (error) {
            console.error('Error updating streak:', error);
        }
    },
};
