-- Add student status with default active for all existing and new records
ALTER TABLE public.siswa
ADD COLUMN IF NOT EXISTS status_siswa VARCHAR(20);

UPDATE public.siswa
SET status_siswa = 'aktif'
WHERE status_siswa IS NULL OR status_siswa = '';

ALTER TABLE public.siswa
ALTER COLUMN status_siswa SET DEFAULT 'aktif';

ALTER TABLE public.siswa
ALTER COLUMN status_siswa SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'siswa_status_siswa_check'
  ) THEN
    ALTER TABLE public.siswa
    ADD CONSTRAINT siswa_status_siswa_check
    CHECK (status_siswa IN ('aktif', 'pindahan', 'keluar'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_siswa_status_siswa ON public.siswa(status_siswa);
