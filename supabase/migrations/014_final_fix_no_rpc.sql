-- ===== MIGRATION 014: Final Fix - Clean & Apply Best Trigger =====
-- Remove RPC dependency, use direct table operations with proper trigger

-- 1. Drop old trigger & function
DROP TRIGGER IF EXISTS trigger_generate_tagihan_kegiatan_kelas ON public.kegiatan_kelas CASCADE;
DROP FUNCTION IF EXISTS public.generate_tagihan_for_kegiatan() CASCADE;

-- 2. Clean duplicates in kegiatan_kelas (keep FIRST occurrence only)
DELETE FROM public.kegiatan_kelas t1
WHERE t1.ctid > (
  SELECT MIN(t2.ctid)
  FROM public.kegiatan_kelas t2
  WHERE t2.kegiatan_id = t1.kegiatan_id
    AND t2.kelas_id = t1.kelas_id
);

-- 3. Clean duplicates in tagihan (keep FIRST occurrence per siswa+kegiatan)
DELETE FROM public.tagihan t1
WHERE t1.ctid > (
  SELECT MIN(t2.ctid)
  FROM public.tagihan t2
  WHERE t2.siswa_id = t1.siswa_id
    AND t2.kegiatan_id = t1.kegiatan_id
);

-- 4. Create BEST trigger function (prevents duplicates with NOT EXISTS)
CREATE OR REPLACE FUNCTION public.generate_tagihan_for_kegiatan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 6. Verify
SELECT '✅ Migration 014 SUCCESS - RPC-free, direct operations' as status;
SELECT COUNT(*) as kegiatan_kelas_count FROM kegiatan_kelas;
SELECT COUNT(*) as tagihan_count FROM tagihan;
