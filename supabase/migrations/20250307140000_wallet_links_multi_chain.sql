-- Allow ethereum and bitcoin chains in wallet_links
ALTER TABLE wallet_links DROP CONSTRAINT IF EXISTS wallet_links_chain_check;
ALTER TABLE wallet_links ADD CONSTRAINT wallet_links_chain_check
  CHECK (chain IN ('solana', 'ethereum', 'bitcoin'));
