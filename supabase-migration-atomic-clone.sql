-- ================================================
-- ATOMIC CLONE COUNT INCREMENT RPC
-- Scalability optimization: Prevents race conditions
-- Run this in Supabase SQL Editor
-- ================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.increment_clone_count(UUID);

-- Create the atomic increment function
CREATE OR REPLACE FUNCTION public.increment_clone_count(p_deck_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- Upsert with atomic increment
    -- If row exists: increment clone_count
    -- If row doesn't exist: create with clone_count = 1
    INSERT INTO public.deck_stats (deck_id, clone_count, rating_sum, rating_count)
    VALUES (p_deck_id, 1, 0, 0)
    ON CONFLICT (deck_id)
    DO UPDATE SET clone_count = deck_stats.clone_count + 1
    RETURNING clone_count INTO v_new_count;

    RETURN v_new_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_clone_count(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.increment_clone_count(UUID) IS 
'Atomically increments the clone count for a deck. Uses UPSERT to handle both existing and new stats rows. Returns the new clone count.';
