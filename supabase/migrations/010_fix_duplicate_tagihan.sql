-- ===== MIGRATION 010: Fix Duplicate Tagihan & Strengthen Trigger =====

-- 1. Delete duplicate tagihan (keep first occurrence)
DELETE FROM public.tagihan t1
WHERE t1.id NOT IN (
  SELECT MIN(t2.id)
  FROM public.tagihan t2
  GROUP BY t2.siswa_id, t2.bulan, t2.tahun
);

-- 2. Drop old trigger/function
DROP TRIGGER IF EXISTS trigger_generate_tagihan_kegiatan_kelas ON public.kegiatan_kelas CASCADE;
DROP FUNCTION IF EXISTS public.generate_tagihan_for_kegiatan() CASCADE;

-- 3. Create new function with stronger conflict handling
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
  ON CONFLICT (siswa_id, bulan, tahun) DO UPDATE 
  SET kegiatan_id = EXCLUDED.kegiatan_id,
      jumlah = EXCLUDED.jumlah,
      tanggal_jatuh_tempo = EXCLUDED.tanggal_jatuh_tempo;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate trigger
CREATE TRIGGER trigger_generate_tagihan_kegiatan_kelas
AFTER INSERT ON public.kegiatan_kelas
FOR EACH ROW
EXECUTE FUNCTION public.generate_tagihan_for_kegiatan();

-- 5. Verify
SELECT '✅ Migration 010 SUCCESS - Duplicate tagihan removed, trigger fixed' as status;
SELECT 'Remaining Tagihan Count' as type, COUNT(*) FROM tagihan;
