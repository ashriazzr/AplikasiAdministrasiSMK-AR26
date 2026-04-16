-- ===== MIGRATION 004 (UPDATED): Audit trail dengan anon mode (no FK constraint) =====

-- 1. Add dicatat_oleh to pembayaran as TEXT (no FK - just store admin name/email)
ALTER TABLE public.pembayaran 
ADD COLUMN IF NOT EXISTS dicatat_oleh TEXT;

CREATE INDEX IF NOT EXISTS idx_pembayaran_dicatat_oleh ON public.pembayaran(dicatat_oleh);

-- 2. Add created_by to kegiatan_administrasi as TEXT (no FK)
ALTER TABLE public.kegiatan_administrasi 
ADD COLUMN IF NOT EXISTS created_by TEXT;

CREATE INDEX IF NOT EXISTS idx_kegiatan_administrasi_created_by ON public.kegiatan_administrasi(created_by);

-- 3. Add CHECK constraint to akun_pembayaran.jenis_akun
UPDATE public.akun_pembayaran 
SET jenis_akun = 'lainnya' 
WHERE jenis_akun NOT IN ('kas', 'bank', 'dompet_digital', 'lainnya');

ALTER TABLE public.akun_pembayaran
DROP CONSTRAINT IF EXISTS ck_jenis_akun;

ALTER TABLE public.akun_pembayaran
ADD CONSTRAINT ck_jenis_akun 
CHECK (jenis_akun IN ('kas', 'bank', 'dompet_digital', 'lainnya'));

-- 4. Create trigger to auto-sync pengeluaran to cashflow
CREATE OR REPLACE FUNCTION public.sync_pengeluaran_to_cashflow()
RETURNS TRIGGER AS $$
DECLARE
  default_akun_id uuid;
BEGIN
  -- Get default akun (first akun_pembayaran record)
  SELECT id INTO default_akun_id FROM public.akun_pembayaran LIMIT 1;
  
  IF default_akun_id IS NULL THEN
    INSERT INTO public.akun_pembayaran (nama_akun, jenis_akun) 
    VALUES ('Kas Umum', 'kas')
    RETURNING id INTO default_akun_id;
  END IF;

  -- Insert into cashflow when pengeluaran is created
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.cashflow (
      tanggal,
      jenis_transaksi,
      kategori,
      jumlah,
      deskripsi,
      akun_pembayaran_id
    ) VALUES (
      COALESCE(NEW.tanggal::date, CURRENT_DATE),
      'expense',
      COALESCE(NEW.kategori, 'pengeluaran_kegiatan'),
      NEW.jumlah,
      COALESCE(NEW.deskripsi, 'Pengeluaran'),
      default_akun_id
    )
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_sync_pengeluaran_to_cashflow ON public.pengeluaran;
CREATE TRIGGER trigger_sync_pengeluaran_to_cashflow 
AFTER INSERT ON public.pengeluaran
FOR EACH ROW EXECUTE FUNCTION public.sync_pengeluaran_to_cashflow();

-- 5. Enable RLS on ALL tables
ALTER TABLE public.administrasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tagihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembayaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfid_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kegiatan_administrasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kegiatan_kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.akun_pembayaran ENABLE ROW LEVEL SECURITY;

-- 6. Create permissive RLS policies (anon mode - allow all)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['administrasi', 'kelas', 'siswa', 'tagihan', 'pembayaran', 'rfid_logs', 'kegiatan_administrasi', 'kegiatan_kelas', 'pengeluaran', 'cashflow', 'akun_pembayaran']
  LOOP
    -- Drop old policies
    EXECUTE format('DROP POLICY IF EXISTS "select_%s" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "insert_%s" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "update_%s" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "delete_%s" ON public.%s', t, t);
    
    -- Create permissive policies (accessible to anon + authenticated)
    EXECUTE format('CREATE POLICY "select_%s" ON public.%s FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "insert_%s" ON public.%s FOR INSERT WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "update_%s" ON public.%s FOR UPDATE USING (true)', t, t);
    EXECUTE format('CREATE POLICY "delete_%s" ON public.%s FOR DELETE USING (true)', t, t);
  END LOOP;
END $$;

SELECT '✅ Migration 004 SUCCESS - Anon mode enabled (no admin FK dependency)' as status;
