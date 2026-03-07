-- FroshFunds initial schema
-- Run this in Supabase Dashboard > SQL Editor

-- User profile (onboarding data)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_income NUMERIC(12,2),
  monthly_savings_goal NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CSV import log (prevents duplicate file ingestion)
CREATE TABLE IF NOT EXISTS csv_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_hash TEXT NOT NULL,
  import_type TEXT CHECK (import_type IN ('transactions', 'investments')),
  imported_at TIMESTAMPTZ DEFAULT now(),
  rows_inserted INT,
  UNIQUE(user_id, file_hash)
);

-- Bank transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT,
  raw_description TEXT,
  source_import_id UUID REFERENCES csv_imports(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Investments
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  asset_name TEXT NOT NULL,
  asset_type TEXT,
  quantity NUMERIC(18,6),
  unit_price NUMERIC(12,4),
  total_value NUMERIC(12,2),
  operation TEXT CHECK (operation IN ('buy', 'sell', 'dividend', 'update')),
  source_import_id UUID REFERENCES csv_imports(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI agent compressed context per user
CREATE TABLE IF NOT EXISTS ai_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  context_summary TEXT,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-runs)
DROP POLICY IF EXISTS "user_isolation" ON transactions;
DROP POLICY IF EXISTS "user_isolation" ON investments;
DROP POLICY IF EXISTS "user_isolation" ON csv_imports;
DROP POLICY IF EXISTS "user_isolation" ON profiles;
DROP POLICY IF EXISTS "user_isolation" ON ai_context;

-- Isolation policies
CREATE POLICY "user_isolation" ON transactions USING (auth.uid() = user_id);
CREATE POLICY "user_isolation" ON investments USING (auth.uid() = user_id);
CREATE POLICY "user_isolation" ON csv_imports USING (auth.uid() = user_id);
CREATE POLICY "user_isolation" ON profiles USING (auth.uid() = id);
CREATE POLICY "user_isolation" ON ai_context USING (auth.uid() = user_id);

-- Allow insert/update on profiles for own row
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Allow insert/select/update on transactions for own data
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (auth.uid() = user_id);

-- Allow insert/select on investments for own data
CREATE POLICY "investments_insert" ON investments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow insert/select on csv_imports for own data
CREATE POLICY "csv_imports_insert" ON csv_imports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow insert/update/select on ai_context for own data
CREATE POLICY "ai_context_insert" ON ai_context FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_context_update" ON ai_context FOR UPDATE USING (auth.uid() = user_id);
