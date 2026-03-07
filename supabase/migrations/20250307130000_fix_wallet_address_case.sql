-- Solana addresses are case-sensitive (base58). Fix is_wallet_linked to compare exactly.
CREATE OR REPLACE FUNCTION public.is_wallet_linked(check_address TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM wallet_links WHERE wallet_address = TRIM(check_address)
  );
$$;
