-- ================================================
-- MIGRATION: Add language preferences to profiles
-- Run this in Supabase SQL Editor
-- ================================================

-- Add language preference columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS native_lang TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS target_lang TEXT DEFAULT 'es',
ADD COLUMN IF NOT EXISTS proficiency_level TEXT DEFAULT 'A1',
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- Update existing users to have onboarding incomplete so they go through setup
-- (Comment this out if you want existing users to skip onboarding)
-- UPDATE public.profiles SET onboarding_complete = FALSE;

-- Add check constraint for valid proficiency levels
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS valid_proficiency_level;

ALTER TABLE public.profiles 
ADD CONSTRAINT valid_proficiency_level 
CHECK (proficiency_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));
