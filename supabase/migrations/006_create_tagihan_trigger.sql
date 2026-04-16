-- ===== MIGRATION 006: Create Trigger for Auto-Generate Tagihan =====

-- Drop old trigger and function if exists
DROP TRIGGER IF EXISTS trigger_generate_tagihan_kegiatan_kelas ON public.kegiatan_kelas;
DROP FUNCTION IF EXISTS public.generate_tagihan_for_kegiatan();

-- Create function to auto-generate tagihan when kegiatan_kelas created
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
    AND NOT EXISTS (
      SELECT 1 FROM public.tagihan t
      WHERE t.siswa_id = siswa.id 
        AND t.kegiatan_id = NEW.kegiatan_id
    )
  ON CONFLICT (siswa_id, bulan, tahun) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_generate_tagihan_kegiatan_kelas
AFTER INSERT ON public.kegiatan_kelas
FOR EACH ROW
EXECUTE FUNCTION public.generate_tagihan_for_kegiatan();

-- Auto-generate tagihan for existing kegiatan_kelas relationships
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
WHERE NOT EXISTS (
  SELECT 1 FROM public.tagihan t 
  WHERE t.siswa_id = siswa.id 
    AND t.kegiatan_id = gk.kegiatan_id
)
ON CONFLICT (siswa_id, bulan, tahun) DO NOTHING;

-- Verify trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'trigger_generate_tagihan_kegiatan_kelas';

-- Check data counts
SELECT 'Tagihan Count' as type, COUNT(*) FROM tagihan;

SELECT '✅ Migration 006 SUCCESS - Trigger created for auto-generating tagihan' as status;
