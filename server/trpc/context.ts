import { createClient } from "@/lib/supabase/server";

export type Context = Awaited<ReturnType<typeof createContext>>;

export async function createContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    userId: user?.id ?? null,
  };
}
