-- Wallet links: maps wallet addresses to users for linked-only Phantom login
CREATE TABLE IF NOT EXISTS wallet_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain TEXT NOT NULL DEFAULT 'solana' CHECK (chain = 'solana'),
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address),
  UNIQUE(user_id, chain)
);

-- Enable RLS
ALTER TABLE wallet_links ENABLE ROW LEVEL SECURITY;

-- Users can read only their own links
CREATE POLICY "wallet_links_select_own" ON wallet_links
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert only for themselves
CREATE POLICY "wallet_links_insert_own" ON wallet_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update only their own links
CREATE POLICY "wallet_links_update_own" ON wallet_links
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete only their own links
CREATE POLICY "wallet_links_delete_own" ON wallet_links
  FOR DELETE USING (auth.uid() = user_id);

-- Function to check if a wallet is linked (used by Phantom sign-in gate)
-- SECURITY DEFINER allows bypassing RLS; callable only by authenticated users
CREATE OR REPLACE FUNCTION public.is_wallet_linked(check_address TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM wallet_links WHERE wallet_address = LOWER(TRIM(check_address))
  );
$$;
