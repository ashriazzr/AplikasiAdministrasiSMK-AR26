-- Simplify kelas schema for Rombel:
-- keep only nama_kelas, jurusan, wali_kelas, tahun_ajaran (+ audit columns)

-- 1) Backfill nama_kelas from legacy columns when needed.
UPDATE public.kelas
SET nama_kelas = TRIM(
  CONCAT_WS(' ',
    NULLIF(kelas, ''),
    NULLIF(jurusan, ''),
    NULLIF(nomor_kelas, '')
  )
)
WHERE (nama_kelas IS NULL OR BTRIM(nama_kelas) = '')
  AND (
    NULLIF(kelas, '') IS NOT NULL
    OR NULLIF(jurusan, '') IS NOT NULL
    OR NULLIF(nomor_kelas, '') IS NOT NULL
  );

-- 2) Enforce non-empty nama_kelas.
ALTER TABLE public.kelas
  ALTER COLUMN nama_kelas SET NOT NULL;

-- 3) Remove legacy columns no longer used by app.
ALTER TABLE public.kelas DROP COLUMN IF EXISTS tingkat;
ALTER TABLE public.kelas DROP COLUMN IF EXISTS kelas;
ALTER TABLE public.kelas DROP COLUMN IF EXISTS nomor_kelas;

-- 4) Optional: keep class names unique ignoring case to avoid import ambiguity.
CREATE UNIQUE INDEX IF NOT EXISTS idx_kelas_nama_kelas_ci
  ON public.kelas (LOWER(nama_kelas));

-- 5) Reload PostgREST schema cache.
NOTIFY pgrst, 'reload schema';
