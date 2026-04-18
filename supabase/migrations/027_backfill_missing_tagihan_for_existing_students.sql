-- ===== MIGRATION 027: Backfill Missing Tagihan for Existing Students =====
-- One-time fill for students that already belong to kelas with kegiatan_kelas,
-- but do not yet have the corresponding tagihan rows.

ALTER TABLE public.tagihan
  ADD COLUMN IF NOT EXISTS kegiatan_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tagihan_kegiatan_id_fkey'
      AND conrelid = 'public.tagihan'::regclass
  ) THEN
    ALTER TABLE public.tagihan
      ADD CONSTRAINT tagihan_kegiatan_id_fkey
      FOREIGN KEY (kegiatan_id) REFERENCES public.kegiatan_administrasi(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.tagihan
  DROP CONSTRAINT IF EXISTS tagihan_siswa_kegiatan_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tagihan_siswa_kegiatan_unique'
      AND conrelid = 'public.tagihan'::regclass
  ) THEN
    ALTER TABLE public.tagihan
      ADD CONSTRAINT tagihan_siswa_kegiatan_unique UNIQUE (siswa_id, kegiatan_id);
  END IF;
END $$;

INSERT INTO public.tagihan (
  siswa_id,
  kegiatan_id,
  bulan,
  tahun,
  jumlah,
  status,
  tanggal_jatuh_tempo
)
SELECT
  s.id AS siswa_id,
  ga.id AS kegiatan_id,
  EXTRACT(MONTH FROM NOW())::int AS bulan,
  EXTRACT(YEAR FROM NOW())::int AS tahun,
  ga.nominal AS jumlah,
  'pending' AS status,
  CURRENT_DATE + INTERVAL '30 days' AS tanggal_jatuh_tempo
FROM public.siswa s
JOIN public.kelas k ON k.id = s.kelas_id
JOIN public.kegiatan_kelas gk ON gk.kelas_id = k.id
JOIN public.kegiatan_administrasi ga ON ga.id = gk.kegiatan_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tagihan t
  WHERE t.siswa_id = s.id
    AND t.kegiatan_id = ga.id
);

SELECT
  '✅ Migration 027 SUCCESS - Missing tagihan backfilled for existing students' AS status;