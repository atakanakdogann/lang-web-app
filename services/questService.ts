import { supabase } from './supabaseClient';

export interface QuestProgress {
    dailyCardsStudied: number;
    dailyPerfectCards: number;
    weeklyDaysPracticed: number;
    weeklyDecksCompleted: number;
    lastPracticeDate: string | null;
    questWeekStart: string | null;
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    type: 'daily' | 'weekly';
    current: number;
    target: number;
    xp: number;
    completed: boolean;
}

const DAILY_QUESTS = [
    { id: 'daily_cards', title: 'Study Cards', description: 'Study 10 cards today', target: 10, xp: 10 },
    { id: 'daily_perfect', title: 'Perfect Practice', description: 'Get 3 ratings of 4+ stars', target: 3, xp: 15 },
];

const WEEKLY_QUESTS = [
    { id: 'weekly_days', title: 'Consistency', description: 'Practice 3 different days', target: 3, xp: 50 },
    { id: 'weekly_decks', title: 'Deck Master', description: 'Complete 1 full deck', target: 1, xp: 100 },
];

// Get today's date in YYYY-MM-DD format (local timezone)
const getToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Get the start of the current week (Monday) in local timezone
const getWeekStart = () => {
    const now = new Date();
    // Reset to start of day
    now.setHours(0, 0, 0, 0);
    const day = now.getDay();
    // Monday is 1, Sunday is 0. If Sunday (0), we want to go back 6 days.
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
};

export const questService = {
    /**
     * Get user's quest progress
     */
    async getQuestProgress(userId: string): Promise<QuestProgress> {
        const { data, error } = await supabase
            .from('profiles')
            .select('daily_cards_studied, daily_perfect_cards, weekly_days_practiced, weekly_decks_completed, last_practice_date, quest_week_start')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching quest progress:', error);
            return {
                dailyCardsStudied: 0,
                dailyPerfectCards: 0,
                weeklyDaysPracticed: 0,
                weeklyDecksCompleted: 0,
                lastPracticeDate: null,
                questWeekStart: null,
            };
        }

        return {
            dailyCardsStudied: data?.daily_cards_studied || 0,
            dailyPerfectCards: data?.daily_perfect_cards || 0,
            weeklyDaysPracticed: data?.weekly_days_practiced || 0,
            weeklyDecksCompleted: data?.weekly_decks_completed || 0,
            lastPracticeDate: data?.last_practice_date || null,
            questWeekStart: data?.quest_week_start || null,
        };
    },

    /**
     * Get formatted quests with current progress
     */
    async getQuests(userId: string): Promise<Quest[]> {
        const progress = await this.getQuestProgress(userId);
        const today = getToday();
        const weekStart = getWeekStart();

        // Check if we need to reset daily quests
        const needsDailyReset = progress.lastPracticeDate !== today;
        // Check if we need to reset weekly quests
        const needsWeeklyReset = progress.questWeekStart !== weekStart;

        if (needsDailyReset || needsWeeklyReset) {
            await this.resetQuests(userId, needsDailyReset, needsWeeklyReset);
            // Refetch after reset
            return this.getQuests(userId);
        }

        const dailyQuests: Quest[] = DAILY_QUESTS.map(q => ({
            ...q,
            type: 'daily' as const,
            current: q.id === 'daily_cards' ? progress.dailyCardsStudied : progress.dailyPerfectCards,
            completed: (q.id === 'daily_cards' ? progress.dailyCardsStudied : progress.dailyPerfectCards) >= q.target,
        }));

        const weeklyQuests: Quest[] = WEEKLY_QUESTS.map(q => ({
            ...q,
            type: 'weekly' as const,
            current: q.id === 'weekly_days' ? progress.weeklyDaysPracticed : progress.weeklyDecksCompleted,
            completed: (q.id === 'weekly_days' ? progress.weeklyDaysPracticed : progress.weeklyDecksCompleted) >= q.target,
        }));

        return [...dailyQuests, ...weeklyQuests];
    },

    /**
     * Reset quests (daily and/or weekly)
     */
    async resetQuests(userId: string, resetDaily: boolean, resetWeekly: boolean) {
        const updates: Record<string, any> = {};

        if (resetDaily) {
            updates.daily_cards_studied = 0;
            updates.daily_perfect_cards = 0;
            updates.last_practice_date = getToday();
        }

        if (resetWeekly) {
            updates.weekly_days_practiced = 0;
            updates.weekly_decks_completed = 0;
            updates.quest_week_start = getWeekStart();
        }

        if (Object.keys(updates).length > 0) {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);

            if (error) console.error('Error resetting quests:', error);
        }
    },

    /**
     * Record a card study (called when user completes a card)
     */
    async recordCardStudy(userId: string, rating: number) {
        const today = getToday();
        const progress = await this.getQuestProgress(userId);

        // Check if this is a new day for practice tracking
        const isNewDay = progress.lastPracticeDate !== today;

        const updates: Record<string, any> = {
            daily_cards_studied: (progress.dailyCardsStudied || 0) + 1,
            last_practice_date: today,
        };

        // Track perfect cards (rating >= 4)
        if (rating >= 4) {
            updates.daily_perfect_cards = (progress.dailyPerfectCards || 0) + 1;
        }

        // If new day, increment weekly days practiced
        if (isNewDay) {
            updates.weekly_days_practiced = (progress.weeklyDaysPracticed || 0) + 1;
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) console.error('Error recording card study:', error);
    },

    /**
     * Record a deck completion
     */
    async recordDeckCompletion(userId: string) {
        const progress = await this.getQuestProgress(userId);

        const { error } = await supabase
            .from('profiles')
            .update({
                weekly_decks_completed: (progress.weeklyDecksCompleted || 0) + 1,
            })
            .eq('id', userId);

        if (error) console.error('Error recording deck completion:', error);
    },

    /**
     * Calculate total XP earned from completed quests
     */
    calculateTotalXP(quests: Quest[]): number {
        return quests.filter(q => q.completed).reduce((sum, q) => sum + q.xp, 0);
    },
};
