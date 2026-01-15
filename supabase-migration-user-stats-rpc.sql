-- ================================================
-- USER STATS RPC FUNCTION
-- Scalability optimization: Calculate stats server-side
-- Run this in Supabase SQL Editor
-- ================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_user_stats(UUID);

-- Create the RPC function
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    v_total_cards_studied INTEGER;
    v_total_decks INTEGER;
    v_average_rating NUMERIC;
    v_streak_days INTEGER;
    v_total_words_learned INTEGER;
    v_practice_history JSON;
BEGIN
    -- 1. Count total cards studied by user
    SELECT COUNT(*)
    INTO v_total_cards_studied
    FROM public.user_progress
    WHERE user_id = p_user_id;

    -- 2. Count decks owned by user
    SELECT COUNT(*)
    INTO v_total_decks
    FROM public.decks
    WHERE created_by = p_user_id;

    -- 3. Calculate average rating (from user_progress.rating)
    SELECT COALESCE(AVG(rating), 0)
    INTO v_average_rating
    FROM public.user_progress
    WHERE user_id = p_user_id
      AND rating IS NOT NULL;

    -- 4. Get streak and total_words_learned from profile
    SELECT 
        COALESCE(streak_days, 0),
        COALESCE(total_words_learned, 0)
    INTO v_streak_days, v_total_words_learned
    FROM public.profiles
    WHERE id = p_user_id;

    -- 5. Generate practice history (last 6 months)
    -- Group by date, count cards studied per day
    SELECT COALESCE(
        json_agg(
            json_build_object('date', practice_date, 'count', card_count)
            ORDER BY practice_date
        ),
        '[]'::json
    )
    INTO v_practice_history
    FROM (
        SELECT 
            DATE(COALESCE(studied_at, created_at)) AS practice_date,
            COUNT(*) AS card_count
        FROM public.user_progress
        WHERE user_id = p_user_id
          AND COALESCE(studied_at, created_at) >= NOW() - INTERVAL '6 months'
        GROUP BY DATE(COALESCE(studied_at, created_at))
    ) AS daily_counts;

    -- Build final result
    result := json_build_object(
        'totalCardsStudied', v_total_cards_studied,
        'totalDecksCompleted', v_total_decks,
        'averageRating', ROUND(v_average_rating::NUMERIC, 1),
        'currentStreak', v_streak_days,
        'longestStreak', v_streak_days,  -- Can be enhanced later with a dedicated column
        'totalWordsLearned', v_total_words_learned,
        'practiceHistory', v_practice_history
    );

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_stats(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_user_stats(UUID) IS 
'Calculates user learning statistics server-side for scalability. Returns JSON with totalCardsStudied, totalDecksCompleted, averageRating, currentStreak, longestStreak, totalWordsLearned, and practiceHistory.';
