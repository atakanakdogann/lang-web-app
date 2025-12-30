-- ================================================
-- AURA DATABASE SCHEMA
-- Language Learning App with Spaced Repetition
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- PROFILES TABLE
-- User account information and stats
-- ================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies: Users can only read/write their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ================================================
-- DECKS TABLE
-- Language learning decks (user-created or official)
-- ================================================
CREATE TABLE IF NOT EXISTS public.decks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_lang TEXT NOT NULL, -- e.g., 'en'
  target_lang TEXT NOT NULL, -- e.g., 'es'
  is_public BOOLEAN DEFAULT FALSE,
  cover_gradient TEXT DEFAULT 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on decks
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

-- Decks policies: Users can see their own decks and all public decks
CREATE POLICY "Users can view own decks"
  ON public.decks FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can view public decks"
  ON public.decks FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Users can insert own decks"
  ON public.decks FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own decks"
  ON public.decks FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own decks"
  ON public.decks FOR DELETE
  USING (auth.uid() = created_by);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_decks_created_by ON public.decks(created_by);
CREATE INDEX IF NOT EXISTS idx_decks_public ON public.decks(is_public) WHERE is_public = TRUE;

-- ================================================
-- CARDS TABLE
-- Individual flashcards within decks
-- ================================================
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  deck_id UUID REFERENCES public.decks(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'Noun', 'Verb', 'Adjective'
  sample_sentence TEXT,
  ai_context TEXT, -- JSON blob for AI explanation/context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on cards
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Cards policies: Users can see cards from decks they own or public decks
CREATE POLICY "Users can view cards from own decks"
  ON public.cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.decks
      WHERE decks.id = cards.deck_id
      AND decks.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view cards from public decks"
  ON public.cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.decks
      WHERE decks.id = cards.deck_id
      AND decks.is_public = TRUE
    )
  );

CREATE POLICY "Users can insert cards into own decks"
  ON public.cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.decks
      WHERE decks.id = cards.deck_id
      AND decks.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update cards in own decks"
  ON public.cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.decks
      WHERE decks.id = cards.deck_id
      AND decks.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete cards from own decks"
  ON public.cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.decks
      WHERE decks.id = cards.deck_id
      AND decks.created_by = auth.uid()
    )
  );

-- Create index for faster deck queries
CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON public.cards(deck_id);

-- ================================================
-- USER_PROGRESS TABLE
-- Tracks user's learning progress with spaced repetition
-- ================================================
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE NOT NULL,
  box INTEGER DEFAULT 1 CHECK (box >= 1 AND box <= 5), -- Leitner box number (1-5)
  next_review TIMESTAMPTZ DEFAULT NOW(),
  last_quality INTEGER CHECK (last_quality >= 0 AND last_quality <= 5), -- 0-5 rating
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id) -- One progress record per user per card
);

-- Enable RLS on user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- User progress policies: Users can only see/modify their own progress
CREATE POLICY "Users can view own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON public.user_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_card_id ON public.user_progress(card_id);
CREATE INDEX IF NOT EXISTS idx_progress_next_review ON public.user_progress(next_review);

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- SEED DATA (Optional - Official Starter Decks)
-- ================================================

-- Insert some official public decks
-- These will be visible to all users but not editable

-- Note: You'll need to create a system user first or use a specific UUID
-- For now, these are commented out. Uncomment and add your admin user ID to seed data.

/*
INSERT INTO public.decks (id, created_by, title, source_lang, target_lang, is_public, cover_gradient)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'YOUR_ADMIN_USER_ID', 'Spanish Essentials - A1', 'en', 'es', TRUE, 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'),
  ('550e8400-e29b-41d4-a716-446655440002', 'YOUR_ADMIN_USER_ID', 'French Basics', 'en', 'fr', TRUE, 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'),
  ('550e8400-e29b-41d4-a716-446655440003', 'YOUR_ADMIN_USER_ID', 'German Starter Pack', 'en', 'de', TRUE, 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)');
*/
