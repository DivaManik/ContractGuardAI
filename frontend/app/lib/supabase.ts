import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public client — untuk dipakai di komponen React (read-only data publik)
export const supabase = createClient(url, anon);

// Server-only client — bypass RLS, hanya dipakai di API routes
export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { persistSession: false },
});
