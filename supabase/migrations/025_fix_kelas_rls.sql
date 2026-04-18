-- Ensure RLS on kelas table is properly set for anon access

-- First, disable RLS temporarily for debugging
ALTER TABLE public.kelas DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "kls_select" ON public.kelas;
DROP POLICY IF EXISTS "kls_insert" ON public.kelas;
DROP POLICY IF EXISTS "kls_update" ON public.kelas;
DROP POLICY IF EXISTS "kls_delete" ON public.kelas;
DROP POLICY IF EXISTS "Enable all for kelas" ON public.kelas;
DROP POLICY IF EXISTS "select_kelas" ON public.kelas;
DROP POLICY IF EXISTS "insert_kelas" ON public.kelas;
DROP POLICY IF EXISTS "update_kelas" ON public.kelas;
DROP POLICY IF EXISTS "delete_kelas" ON public.kelas;

-- Re-enable RLS
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;

-- Create clean permissive policies (anon access)
CREATE POLICY "kls_select" ON public.kelas FOR SELECT USING (true);
CREATE POLICY "kls_insert" ON public.kelas FOR INSERT WITH CHECK (true);
CREATE POLICY "kls_update" ON public.kelas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "kls_delete" ON public.kelas FOR DELETE USING (true);
