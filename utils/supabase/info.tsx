/* Supabase Configuration - Updated */

export const projectId = "tylovgteozoxgztbkvbb"
export const publicAnonKey = "sb_publishable_DfKqcqvy87KiIFQFJcv94A_zdxflf7K"
export const supabaseUrl = "https://tylovgteozoxgztbkvbb.supabase.co"

// Export environment variables
export const getSupabaseConfig = () => ({
  url: import.meta.env.VITE_SUPABASE_URL || supabaseUrl,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || publicAnonKey,
})