-- ===== MIGRATION 012_v2: Clean Database - Simpler Approach =====

-- 1. Drop trigger (stop auto-generation while cleaning)
DROP TRIGGER IF EXISTS trigger_generate_tagihan_kegiatan_kelas ON public.kegiatan_kelas CASCADE;
DROP FUNCTION IF EXISTS public.generate_tagihan_for_kegiatan() CASCADE;

-- 2. Clean kegiatan_kelas: Keep ONLY one per uniqueness, delete rest using ctid
DELETE FROM public.kegiatan_kelas t1
USING public.kegiatan_kelas t2
WHERE t1.ctid > t2.ctid
  AND t1.kegiatan_id = t2.kegiatan_id
  AND t1.kelas_id = t2.kelas_id;

-- 3. Clean tagihan: Keep ONLY one per (siswa_id, kegiatan_id), delete rest
DELETE FROM public.tagihan t1
USING public.tagihan t2
WHERE t1.ctid > t2.ctid
  AND t1.siswa_id = t2.siswa_id
  AND t1.kegiatan_id = t2.kegiatan_id;

-- 4. Create the NEW trigger function (using NOT EXISTS)
CREATE OR REPLACE FUNCTION public.generate_tagihan_for_kegiatan()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.tagihan (siswa_id, kegiatan_id, bulan, tahun, jumlah, status, tanggal_jatuh_tempo)
  SELECT 
    siswa.id,
    NEW.kegiatan_id,
    EXTRACT(MONTH FROM NOW())::int,
    EXTRACT(YEAR FROM NOW())::int,
    kegiatan.nominal,
    'pending',
    CURRENT_DATE + INTERVAL '30 days'
  FROM public.siswa
  JOIN public.kegiatan_administrasi kegiatan ON kegiatan.id = NEW.kegiatan_id
  WHERE siswa.kelas_id = NEW.kelas_id
    AND NOT EXISTS (
      SELECT 1 FROM public.tagihan t 
      WHERE t.siswa_id = siswa.id 
        AND t.kegiatan_id = NEW.kegiatan_id
    );
  RETURN NEW;
END;
$function$;

-- 5. Recreate trigger
CREATE TRIGGER trigger_generate_tagihan_kegiatan_kelas
AFTER INSERT ON public.kegiatan_kelas
FOR EACH ROW
EXECUTE FUNCTION public.generate_tagihan_for_kegiatan();

-- 6. Verify success
SELECT '✅ Migration 012_v2 SUCCESS - Database cleaned & trigger recreated' as status;
SELECT COUNT(*) as total_kegiatan_kelas FROM kegiatan_kelas;
SELECT COUNT(*) as total_tagihan FROM tagihan;
