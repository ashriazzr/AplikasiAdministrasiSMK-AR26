-- Migration: Fix RLS Policies - Remove conflicting policies from migration 001
-- Purpose: Ensure all tables have permissive policies for anon mode access
-- Issue: Migration 001 creates restrictive policies that aren't properly replaced in migration 004

-- 1. Drop old restrictive policies that have different names
DROP POLICY IF EXISTS "TU lihat data sendiri" ON public.administrasi;
DROP POLICY IF EXISTS "Enable all for kelas" ON public.kelas;
DROP POLICY IF EXISTS "Enable all for siswa" ON public.siswa;
DROP POLICY IF EXISTS "Enable all for tagihan" ON public.tagihan;
DROP POLICY IF EXISTS "Enable all for pembayaran" ON public.pembayaran;
DROP POLICY IF EXISTS "Enable all for rfid_logs" ON public.rfid_logs;
DROP POLICY IF EXISTS "Enable all for kegiatan_administrasi" ON public.kegiatan_administrasi;
DROP POLICY IF EXISTS "Enable all for kegiatan_kelas" ON public.kegiatan_kelas;
DROP POLICY IF EXISTS "Enable all for pengeluaran" ON public.pengeluaran;
DROP POLICY IF EXISTS "Enable all for cashflow" ON public.cashflow;
DROP POLICY IF EXISTS "Enable all for akun_pembayaran" ON public.akun_pembayaran;
DROP POLICY IF EXISTS "Enable insert for administrasi" ON public.administrasi;
DROP POLICY IF EXISTS "Enable update for administrasi" ON public.administrasi;
DROP POLICY IF EXISTS "Enable delete for administrasi" ON public.administrasi;

-- 2. Drop duplicate policies from migration 004 if they exist
DROP POLICY IF EXISTS "select_administrasi" ON public.administrasi;
DROP POLICY IF EXISTS "insert_administrasi" ON public.administrasi;
DROP POLICY IF EXISTS "update_administrasi" ON public.administrasi;
DROP POLICY IF EXISTS "delete_administrasi" ON public.administrasi;

DROP POLICY IF EXISTS "select_kelas" ON public.kelas;
DROP POLICY IF EXISTS "insert_kelas" ON public.kelas;
DROP POLICY IF EXISTS "update_kelas" ON public.kelas;
DROP POLICY IF EXISTS "delete_kelas" ON public.kelas;

-- 3. Create clean permissive policies for all tables (anon mode)
-- Administrasi table - allow all access
CREATE POLICY "adm_select" ON public.administrasi FOR SELECT USING (true);
CREATE POLICY "adm_insert" ON public.administrasi FOR INSERT WITH CHECK (true);
CREATE POLICY "adm_update" ON public.administrasi FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "adm_delete" ON public.administrasi FOR DELETE USING (true);

-- Kelas table - allow all access
CREATE POLICY "kls_select" ON public.kelas FOR SELECT USING (true);
CREATE POLICY "kls_insert" ON public.kelas FOR INSERT WITH CHECK (true);
CREATE POLICY "kls_update" ON public.kelas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "kls_delete" ON public.kelas FOR DELETE USING (true);

-- Siswa table - allow all access
CREATE POLICY "swu_select" ON public.siswa FOR SELECT USING (true);
CREATE POLICY "swu_insert" ON public.siswa FOR INSERT WITH CHECK (true);
CREATE POLICY "swu_update" ON public.siswa FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "swu_delete" ON public.siswa FOR DELETE USING (true);

-- Tagihan table - allow all access
CREATE POLICY "tag_select" ON public.tagihan FOR SELECT USING (true);
CREATE POLICY "tag_insert" ON public.tagihan FOR INSERT WITH CHECK (true);
CREATE POLICY "tag_update" ON public.tagihan FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "tag_delete" ON public.tagihan FOR DELETE USING (true);

-- Pembayaran table - allow all access
CREATE POLICY "pmb_select" ON public.pembayaran FOR SELECT USING (true);
CREATE POLICY "pmb_insert" ON public.pembayaran FOR INSERT WITH CHECK (true);
CREATE POLICY "pmb_update" ON public.pembayaran FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "pmb_delete" ON public.pembayaran FOR DELETE USING (true);

-- RFID logs table - allow all access
CREATE POLICY "rfd_select" ON public.rfid_logs FOR SELECT USING (true);
CREATE POLICY "rfd_insert" ON public.rfid_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "rfd_update" ON public.rfid_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "rfd_delete" ON public.rfid_logs FOR DELETE USING (true);

-- Kegiatan administrasi table - allow all access
CREATE POLICY "kga_select" ON public.kegiatan_administrasi FOR SELECT USING (true);
CREATE POLICY "kga_insert" ON public.kegiatan_administrasi FOR INSERT WITH CHECK (true);
CREATE POLICY "kga_update" ON public.kegiatan_administrasi FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "kga_delete" ON public.kegiatan_administrasi FOR DELETE USING (true);

-- Kegiatan kelas table - allow all access
CREATE POLICY "kgk_select" ON public.kegiatan_kelas FOR SELECT USING (true);
CREATE POLICY "kgk_insert" ON public.kegiatan_kelas FOR INSERT WITH CHECK (true);
CREATE POLICY "kgk_update" ON public.kegiatan_kelas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "kgk_delete" ON public.kegiatan_kelas FOR DELETE USING (true);

-- Pengeluaran table - allow all access
CREATE POLICY "pgl_select" ON public.pengeluaran FOR SELECT USING (true);
CREATE POLICY "pgl_insert" ON public.pengeluaran FOR INSERT WITH CHECK (true);
CREATE POLICY "pgl_update" ON public.pengeluaran FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "pgl_delete" ON public.pengeluaran FOR DELETE USING (true);

-- Cashflow table - allow all access
CREATE POLICY "cash_select" ON public.cashflow FOR SELECT USING (true);
CREATE POLICY "cash_insert" ON public.cashflow FOR INSERT WITH CHECK (true);
CREATE POLICY "cash_update" ON public.cashflow FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "cash_delete" ON public.cashflow FOR DELETE USING (true);

-- Akun Pembayaran table - allow all access
CREATE POLICY "akun_select" ON public.akun_pembayaran FOR SELECT USING (true);
CREATE POLICY "akun_insert" ON public.akun_pembayaran FOR INSERT WITH CHECK (true);
CREATE POLICY "akun_update" ON public.akun_pembayaran FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "akun_delete" ON public.akun_pembayaran FOR DELETE USING (true);

-- Kategori table - allow all access
CREATE POLICY "ktg_select" ON public.kategori FOR SELECT USING (true);
CREATE POLICY "ktg_insert" ON public.kategori FOR INSERT WITH CHECK (true);
CREATE POLICY "ktg_update" ON public.kategori FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ktg_delete" ON public.kategori FOR DELETE USING (true);

SELECT '✅ Migration 021 SUCCESS - RLS Policies cleaned and fixed for anon mode' as status;
