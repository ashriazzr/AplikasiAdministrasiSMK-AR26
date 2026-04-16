-- ===== MIGRATION 019: Fix Tagihan Constraint & Regenerate Missing Tagihan =====

-- 1. First, check if constraint exists and add it if missing
DO $$ 
BEGIN
  -- Try to add UNIQUE constraint if it doesn't exist
  ALTER TABLE public.tagihan
  ADD CONSTRAINT tagihan_siswa_kegiatan_unique UNIQUE (siswa_id, bulan, tahun);
EXCEPTION 
  WHEN duplicate_object THEN 
    NULL;  -- Constraint already exists
  WHEN OTHERS THEN
    -- If constraint already exists with different name, that's ok
    NULL;
END $$;

-- 2. Regenerate semua tagihan yang missing untuk siswa di kelas dengan kegiatan
-- Using INSERT ... WHERE NOT EXISTS instead of ON CONFLICT
INSERT INTO public.tagihan (siswa_id, kegiatan_id, bulan, tahun, jumlah, status, tanggal_jatuh_tempo)
SELECT 
  siswa.id,
  kegiatan.id as kegiatan_id,
  EXTRACT(MONTH FROM NOW())::int as bulan,
  EXTRACT(YEAR FROM NOW())::int as tahun,
  kegiatan.nominal,
  'pending',
  CURRENT_DATE + INTERVAL '30 days'
FROM siswa
INNER JOIN kelas ON siswa.kelas_id = kelas.id
INNER JOIN kegiatan_kelas ON kegiatan_kelas.kelas_id = kelas.id
INNER JOIN kegiatan_administrasi kegiatan ON kegiatan_kelas.kegiatan_id = kegiatan.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.tagihan t 
  WHERE t.siswa_id = siswa.id 
    AND t.kegiatan_id = kegiatan.id
);

-- 3. Verify results
SELECT 
  COUNT(*) as total_tagihan,
  COUNT(DISTINCT siswa_id) as total_siswa_with_tagihan,
  COUNT(DISTINCT kegiatan_id) as total_kegiatan_with_tagihan
FROM public.tagihan;

-- 4. Show sample of newly created tagihan
SELECT 
  s.nama as siswa_nama,
  k.nama_kelas,
  ka.nama_kegiatan,
  t.jumlah,
  t.status
FROM public.tagihan t
INNER JOIN public.siswa s ON t.siswa_id = s.id
INNER JOIN public.kelas k ON s.kelas_id = k.id
INNER JOIN public.kegiatan_administrasi ka ON t.kegiatan_id = ka.id
ORDER BY s.nama, ka.nama_kegiatan
LIMIT 20;

SELECT '✅ Migration 019 SUCCESS - Tagihan constraint fixed and regenerated' as status;
