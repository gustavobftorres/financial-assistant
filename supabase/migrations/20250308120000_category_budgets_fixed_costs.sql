CREATE TABLE category_budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  monthly_limit NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category)
);
ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON category_budgets
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE fixed_costs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  installments INT NOT NULL DEFAULT 1,
  start_month  TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON fixed_costs
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
