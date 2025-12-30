-- ================================================
-- MIGRATION: Update user_progress for star ratings
-- Run this in Supabase SQL Editor
-- ================================================

-- Add rating column (1-5 with 0.5 increments)
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) CHECK (rating >= 1 AND rating <= 5);

-- Add studied_at column to track when card was last studied
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS studied_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster deck progress queries
CREATE INDEX IF NOT EXISTS idx_user_progress_card ON public.user_progress(card_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_progress(user_id);
