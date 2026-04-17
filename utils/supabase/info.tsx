/* Supabase configuration from environment */

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ""
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ""
export const projectId = supabaseUrl
  .replace(/^https:\/\//, "")
  .replace(/\.supabase\.co$/, "")

// Export environment variables
export const getSupabaseConfig = () => ({
  url: supabaseUrl,
  anonKey: publicAnonKey,
})