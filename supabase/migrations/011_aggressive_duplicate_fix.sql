-- ===== MIGRATION 011: Aggressive Fix - Clean All & Rebuild =====

-- 1. Drop trigger first (stop auto-generation)
DROP TRIGGER IF EXISTS trigger_generate_tagihan_kegiatan_kelas ON public.kegiatan_kelas CASCADE;
DROP FUNCTION IF EXISTS public.generate_tagihan_for_kegiatan() CASCADE;

-- 2. Delete ALL duplicate kegiatan_kelas (keep only one per kegiatan_id, kelas_id)
DELETE FROM public.kegiatan_kelas gk1
WHERE gk1.rowid > (
  SELECT MIN(gk2.rowid)
  FROM public.kegiatan_kelas gk2
  WHERE gk2.kegiatan_id = gk1.kegiatan_id
    AND gk2.kelas_id = gk1.kelas_id
);

-- Alternative if rowid not available:
-- DELETE FROM public.kegiatan_kelas gk1
-- WHERE (gk1.kegiatan_id, gk1.kelas_id) IN (
--   SELECT kegiatan_id, kelas_id
--   FROM public.kegiatan_kelas
--   GROUP BY kegiatan_id, kelas_id
--   HAVING COUNT(*) > 1
-- )
-- AND gk1.ctid NOT IN (
--   SELECT MIN(ctid)
--   FROM public.kegiatan_kelas
--   GROUP BY kegiatan_id, kelas_id
-- );

-- 3. Delete ALL duplicate tagihan (keep first occurrence per siswa, bulan, tahun)
DELETE FROM public.tagihan t1
WHERE t1.id NOT IN (
  SELECT MIN(t2.id)
  FROM public.tagihan t2
  GROUP BY t2.siswa_id, t2.bulan, t2.tahun
);

-- 4. Recreate trigger with proper ON CONFLICT handling
CREATE OR REPLACE FUNCTION public.generate_tagihan_for_kegiatan()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tagihan (siswa_id, kegiatan_id, bulan, tahun, jumlah, status, tanggal_jatuh_tempo)
  SELECT 
    siswa.id,
    NEW.kegiatan_id,
    EXTRACT(MONTH FROM CURRENT_DATE)::int as bulan,
    EXTRACT(YEAR FROM CURRENT_DATE)::int as tahun,
    kegiatan.nominal,
    'pending',
    CURRENT_DATE + INTERVAL '30 days'
  FROM public.siswa
  INNER JOIN public.kegiatan_administrasi kegiatan ON kegiatan.id = NEW.kegiatan_id
  WHERE siswa.kelas_id = NEW.kelas_id
  ON CONFLICT (siswa_id, bulan, tahun) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Recreate trigger
CREATE TRIGGER trigger_generate_tagihan_kegiatan_kelas
AFTER INSERT ON public.kegiatan_kelas
FOR EACH ROW
EXECUTE FUNCTION public.generate_tagihan_for_kegiatan();

-- 6. Re-generate ALL tagihan for existing kegiatan_kelas relationships
INSERT INTO public.tagihan (siswa_id, kegiatan_id, bulan, tahun, jumlah, status, tanggal_jatuh_tempo)
SELECT DISTINCT 
  siswa.id,
  gk.kegiatan_id,
  EXTRACT(MONTH FROM CURRENT_DATE)::int,
  EXTRACT(YEAR FROM CURRENT_DATE)::int,
  kegiatan.nominal,
  'pending',
  CURRENT_DATE + INTERVAL '30 days'
FROM public.siswa
INNER JOIN public.kegiatan_kelas gk ON siswa.kelas_id = gk.kelas_id
INNER JOIN public.kegiatan_administrasi kegiatan ON gk.kegiatan_id = kegiatan.id
ON CONFLICT (siswa_id, bulan, tahun) DO NOTHING;

-- 7. Verify
SELECT '✅ Migration 011 SUCCESS - All duplicates cleared, trigger rebuild complete' as status;
SELECT 'Kegiatan-Kelas Count' as type, COUNT(*) FROM kegiatan_kelas;
SELECT 'Tagihan Count' as type, COUNT(*) FROM tagihan;
