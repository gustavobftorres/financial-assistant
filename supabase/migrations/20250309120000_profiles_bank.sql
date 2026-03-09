-- Add bank column to profiles for CSV parser selection
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bank TEXT DEFAULT 'generic';
