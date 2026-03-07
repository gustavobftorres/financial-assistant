export interface Investment {
  id: string;
  user_id: string;
  date: string;
  asset_name: string;
  asset_type: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_value: number | null;
  operation: "buy" | "sell" | "dividend" | "update";
  source_import_id: string | null;
  created_at: string;
}
