-- ===== MIGRATION 008: Fix Audit Fields - Convert FK UUID to TEXT =====

-- 1. Drop ALL dependent views/rules/triggers first
DROP VIEW IF EXISTS public.v_kegiatan_dengan_kelas CASCADE;
DROP TRIGGER IF EXISTS trigger_kegiatan_created_by_check ON public.kegiatan_administrasi CASCADE;
DROP TRIGGER IF EXISTS trigger_pembayaran_dicatat_oleh_check ON public.pembayaran CASCADE;

-- 2. Remove FK constraints
DO $$
BEGIN
  -- Remove constraint on kegiatan_administrasi.created_by
  BEGIN
    ALTER TABLE public.kegiatan_administrasi 
    DROP CONSTRAINT kegiatan_administrasi_created_by_fkey;
  EXCEPTION WHEN OTHERS THEN
    -- Constraint doesn't exist, skip
    NULL;
  END;

  -- Remove constraint on pembayaran.dicatat_oleh
  BEGIN
    ALTER TABLE public.pembayaran 
    DROP CONSTRAINT pembayaran_dicatat_oleh_fkey;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- 3. Convert created_by from UUID to TEXT
ALTER TABLE public.kegiatan_administrasi 
ALTER COLUMN created_by TYPE text USING COALESCE(created_by::text, 'System');

-- 4. Convert dicatat_oleh from UUID to TEXT
ALTER TABLE public.pembayaran 
ALTER COLUMN dicatat_oleh TYPE text USING COALESCE(dicatat_oleh::text, NULL);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_kegiatan_administrasi_created_by ON public.kegiatan_administrasi(created_by);
CREATE INDEX IF NOT EXISTS idx_pembayaran_dicatat_oleh ON public.pembayaran(dicatat_oleh);

-- 6. Verify results
SELECT 'kegiatan_administrasi.created_by' as field, data_type 
FROM information_schema.columns 
WHERE table_name = 'kegiatan_administrasi' AND column_name = 'created_by'
UNION ALL
SELECT 'pembayaran.dicatat_oleh', data_type 
FROM information_schema.columns 
WHERE table_name = 'pembayaran' AND column_name = 'dicatat_oleh';

SELECT '✅ Migration 008 SUCCESS - Audit fields converted to TEXT' as status;
