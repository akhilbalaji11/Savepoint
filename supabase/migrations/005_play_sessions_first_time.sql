-- Migration 005: Track whether a diary session is the first time playing

ALTER TABLE public.play_sessions
ADD COLUMN IF NOT EXISTS first_time_play boolean NOT NULL DEFAULT false;

