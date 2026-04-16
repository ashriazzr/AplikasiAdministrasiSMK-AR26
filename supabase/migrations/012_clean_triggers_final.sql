-- ===== MIGRATION 012: Clean Database & Apply Final Trigger =====
-- Purpose: Remove ALL duplicates and apply the NOT EXISTS trigger

-- 1. Drop trigger first
DROP TRIGGER IF EXISTS trigger_generate_tagihan_kegiatan_kelas ON public.kegiatan_kelas CASCADE;
DROP FUNCTION IF EXISTS public.generate_tagihan_for_kegiatan() CASCADE;

-- 2. Delete duplicate kegiatan_kelas (keep only first occurrence)
DELETE FROM public.kegiatan_kelas 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM public.kegiatan_kelas 
  GROUP BY kegiatan_id, kelas_id
);

-- 3. Delete duplicate tagihan (keep only first occurrence)
DELETE FROM public.tagihan 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM public.tagihan 
  GROUP BY siswa_id, kegiatan_id
);

-- 4. Apply the BEST trigger (uses NOT EXISTS to prevent duplicates)
CREATE OR REPLACE FUNCTION public.generate_tagihan_for_kegiatan()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.tagihan (siswa_id, kegiatan_id, bulan, tahun, jumlah, status, tanggal_jatuh_tempo)
  SELECT siswa.id, NEW.kegiatan_id, EXTRACT(MONTH FROM NOW())::int, EXTRACT(YEAR FROM NOW())::int,
         kegiatan.nominal, 'pending', CURRENT_DATE + INTERVAL '30 days'
  FROM public.siswa
  CROSS JOIN public.kegiatan_administrasi kegiatan
  WHERE siswa.kelas_id = NEW.kelas_id AND kegiatan.id = NEW.kegiatan_id
    AND NOT EXISTS (SELECT 1 FROM public.tagihan t WHERE t.siswa_id = siswa.id AND t.kegiatan_id = NEW.kegiatan_id);
  RETURN NEW;
END;
$function$;

-- 5. Recreate trigger
CREATE TRIGGER trigger_generate_tagihan_kegiatan_kelas
AFTER INSERT ON public.kegiatan_kelas
FOR EACH ROW
EXECUTE FUNCTION public.generate_tagihan_for_kegiatan();

-- 6. Verify
SELECT '✅ Migration 012 SUCCESS' as status;
SELECT 'Total Kegiatan-Kelas' as label, COUNT(*) as count FROM kegiatan_kelas;
SELECT 'Total Tagihan' as label, COUNT(*) as count FROM tagihan;
