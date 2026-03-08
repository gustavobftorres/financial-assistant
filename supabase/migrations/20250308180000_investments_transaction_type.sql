-- Add transaction_type to investments for B3 movimentação (Dividendo, Juros, Transferência - Liquidação, etc.)
ALTER TABLE investments ADD COLUMN IF NOT EXISTS transaction_type TEXT;
