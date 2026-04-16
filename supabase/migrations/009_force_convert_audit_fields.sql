-- ===== MIGRATION 009: Force Convert Audit Fields to TEXT (Simple Direct) =====

-- 1. Create temporary column as TEXT
ALTER TABLE public.kegiatan_administrasi 
ADD COLUMN created_by_temp TEXT;

-- 2. Copy data from UUID column to TEXT (convert NULL to 'System')
UPDATE public.kegiatan_administrasi 
SET created_by_temp = COALESCE(created_by::text, 'System');

-- 3. Drop old UUID column and its constraint
ALTER TABLE public.kegiatan_administrasi 
DROP CONSTRAINT IF EXISTS kegiatan_administrasi_created_by_fkey;

ALTER TABLE public.kegiatan_administrasi 
DROP COLUMN created_by;

-- 4. Rename new TEXT column to original name
ALTER TABLE public.kegiatan_administrasi 
RENAME COLUMN created_by_temp TO created_by;

-- 5. Create index
CREATE INDEX IF NOT EXISTS idx_kegiatan_administrasi_created_by ON public.kegiatan_administrasi(created_by);

-- 6. Do same for pembayaran.dicatat_oleh
ALTER TABLE public.pembayaran 
ADD COLUMN dicatat_oleh_temp TEXT;

UPDATE public.pembayaran 
SET dicatat_oleh_temp = COALESCE(dicatat_oleh::text, NULL);

ALTER TABLE public.pembayaran 
DROP CONSTRAINT IF EXISTS pembayaran_dicatat_oleh_fkey;

ALTER TABLE public.pembayaran 
DROP COLUMN dicatat_oleh;

ALTER TABLE public.pembayaran 
RENAME COLUMN dicatat_oleh_temp TO dicatat_oleh;

CREATE INDEX IF NOT EXISTS idx_pembayaran_dicatat_oleh ON public.pembayaran(dicatat_oleh);

-- 7. Verify
SELECT 'kegiatan_administrasi.created_by' as field, data_type 
FROM information_schema.columns 
WHERE table_name = 'kegiatan_administrasi' AND column_name = 'created_by'
UNION ALL
SELECT 'pembayaran.dicatat_oleh', data_type 
FROM information_schema.columns 
WHERE table_name = 'pembayaran' AND column_name = 'dicatat_oleh';

SELECT '✅ Migration 009 SUCCESS - Audit fields now TEXT' as status;
