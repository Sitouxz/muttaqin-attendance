import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Service role client — only use in API routes, never expose to client
export const serviceClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
