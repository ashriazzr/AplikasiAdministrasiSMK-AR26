-- ===== MIGRATION 007: Fix FK - Siswa tidak hilang saat kelas dihapus =====

-- 1. Make kelas_id nullable
ALTER TABLE public.siswa 
ALTER COLUMN kelas_id DROP NOT NULL;

-- 2. Drop old FK constraint with CASCADE
ALTER TABLE public.siswa
DROP CONSTRAINT siswa_kelas_id_fkey;

-- 3. Add new FK constraint with SET NULL (siswa tidak terhapus)
ALTER TABLE public.siswa
ADD CONSTRAINT siswa_kelas_id_fkey 
FOREIGN KEY (kelas_id) REFERENCES public.kelas(id) ON DELETE SET NULL;

-- 4. Verify changes
SELECT 'Constraint Info' as type, 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'siswa'::regclass AND conname LIKE '%kelas%';

SELECT '✅ Migration 007 SUCCESS - FK Changed: ON DELETE SET NULL' as status;
