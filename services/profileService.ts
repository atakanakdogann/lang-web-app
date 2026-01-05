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
            // Get all user's deck progress
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

            // Get profile for streak info
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('streak_days, daily_cards_studied, last_practice_date')
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
                totalWordsLearned: totalCardsStudied,
                totalDecksCompleted,
                averageRating: Math.round(averageRating * 10) / 10,
                currentStreak: profileData?.streak_days || 0,
                longestStreak: profileData?.streak_days || 0, // We'd need to track this separately
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
};
