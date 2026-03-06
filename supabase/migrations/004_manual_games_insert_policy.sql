-- Migration 004: Allow authenticated users to create manual game stubs
-- Needed for Diary entries when a typed title is not already cached.

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "games_insert_manual_authenticated" ON public.games;

CREATE POLICY "games_insert_manual_authenticated"
  ON public.games FOR INSERT
  TO authenticated
  WITH CHECK (
    provider = 'manual'
    AND provider_game_id LIKE 'manual_%'
  );

