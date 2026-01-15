-- ================================================
-- ADD LEVEL COLUMN TO DECKS TABLE
-- Run this in Supabase SQL Editor
-- ================================================

-- Add level column (e.g., 'A1', 'B1', 'C1')
ALTER TABLE public.decks 
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT NULL;

-- Optional: Add comment for documentation
COMMENT ON COLUMN public.decks.level IS 'Proficiency level of the deck (A1, A2, B1, B2, C1, C2)';
