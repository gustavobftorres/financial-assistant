-- Add best savings streak to profiles for tracking record
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_savings_streak INTEGER DEFAULT 0;
