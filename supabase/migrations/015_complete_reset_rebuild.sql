-- ===== MIGRATION 015: COMPLETE RESET & REBUILD SYSTEM =====
-- Hapus semua data, pastikan trigger berfungsi, rebuild dari 0

-- 1. DROP old trigger & function
DROP TRIGGER IF EXISTS trigger_generate_tagihan_kegiatan_kelas ON public.kegiatan_kelas CASCADE;
DROP FUNCTION IF EXISTS public.generate_tagihan_for_kegiatan() CASCADE;

-- 2. DELETE ALL DATA (clean slate)
DELETE FROM public.tagihan;
DELETE FROM public.kegiatan_kelas;
DELETE FROM public.kegiatan_administrasi;

-- 3. CREATE FINAL TRIGGER FUNCTION (dengan NOT EXISTS untuk prevent duplicates)
CREATE OR REPLACE FUNCTION public.generate_tagihan_for_kegiatan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Insert tagihan untuk setiap siswa di kelas yang di-assign ke kegiatan ini
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

-- 4. CREATE TRIGGER (fires AFTER INSERT on kegiatan_kelas)
CREATE TRIGGER trigger_generate_tagihan_kegiatan_kelas
AFTER INSERT ON public.kegiatan_kelas
FOR EACH ROW
EXECUTE FUNCTION public.generate_tagihan_for_kegiatan();

-- 5. Verify clean state
SELECT '✅ SYSTEM RESET COMPLETE - Ready for integration' as status;
SELECT COUNT(*) as kegiatan_count FROM kegiatan_administrasi;
SELECT COUNT(*) as kegiatan_kelas_count FROM kegiatan_kelas;
SELECT COUNT(*) as tagihan_count FROM tagihan;
