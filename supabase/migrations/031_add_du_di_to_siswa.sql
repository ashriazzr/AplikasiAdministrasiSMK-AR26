-- Add DU/DI field for student PKL placement information

ALTER TABLE IF EXISTS public.siswa
ADD COLUMN IF NOT EXISTS du_di VARCHAR(200);

ALTER TABLE IF EXISTS public.siswa
ALTER COLUMN du_di DROP NOT NULL;