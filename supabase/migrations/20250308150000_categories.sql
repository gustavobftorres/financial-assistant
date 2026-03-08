CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON categories
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
