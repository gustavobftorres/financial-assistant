export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  raw_description: string | null;
  source_import_id: string | null;
  created_at: string;
}

export interface TransactionRow {
  date: string;
  description: string;
  amount: number;
}
