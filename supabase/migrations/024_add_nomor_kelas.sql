-- Add nomor_kelas column to kelas table for class numbering (e.g., X TKJ 1, X TKJ 2)

ALTER TABLE public.kelas ADD COLUMN IF NOT EXISTS nomor_kelas VARCHAR(20);

-- Update existing records: generate nomor_kelas from nama_kelas if not already set
-- Pattern: If nama_kelas is "X TKJ" and we don't have nomor_kelas, leave it empty
-- Future records must specify nomor_kelas explicitly
