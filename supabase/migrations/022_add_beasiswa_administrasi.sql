-- ===== MIGRATION 022: Add Beasiswa Administrasi =====
-- Tujuan: Mengelola program beasiswa/keringanan administrasi untuk siswa terpilih
-- dan menggratiskan beberapa kegiatan administrasi yang dipilih.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Master table program beasiswa
CREATE TABLE IF NOT EXISTS public.beasiswa_administrasi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_program VARCHAR(200) NOT NULL,
  deskripsi TEXT,
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Relasi beasiswa ↔ siswa
CREATE TABLE IF NOT EXISTS public.beasiswa_administrasi_siswa (
  beasiswa_id UUID NOT NULL REFERENCES public.beasiswa_administrasi(id) ON DELETE CASCADE,
  siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
  PRIMARY KEY (beasiswa_id, siswa_id)
);

CREATE INDEX IF NOT EXISTS idx_beasiswa_administrasi_siswa_siswa_id
  ON public.beasiswa_administrasi_siswa (siswa_id);

-- 3. Relasi beasiswa ↔ kegiatan administrasi
CREATE TABLE IF NOT EXISTS public.beasiswa_administrasi_kegiatan (
  beasiswa_id UUID NOT NULL REFERENCES public.beasiswa_administrasi(id) ON DELETE CASCADE,
  kegiatan_id UUID NOT NULL REFERENCES public.kegiatan_administrasi(id) ON DELETE CASCADE,
  PRIMARY KEY (beasiswa_id, kegiatan_id)
);

CREATE INDEX IF NOT EXISTS idx_beasiswa_administrasi_kegiatan_kegiatan_id
  ON public.beasiswa_administrasi_kegiatan (kegiatan_id);

-- 4. Updated at trigger for master table
DROP TRIGGER IF EXISTS trigger_update_beasiswa_administrasi_updated_at ON public.beasiswa_administrasi;
CREATE TRIGGER trigger_update_beasiswa_administrasi_updated_at
BEFORE UPDATE ON public.beasiswa_administrasi
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Helper: cek apakah siswa bebas biaya untuk kegiatan tertentu
CREATE OR REPLACE FUNCTION public.is_beasiswa_administrasi_bebas(
  p_siswa_id UUID,
  p_kegiatan_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.beasiswa_administrasi ba
    INNER JOIN public.beasiswa_administrasi_siswa bas
      ON bas.beasiswa_id = ba.id
    INNER JOIN public.beasiswa_administrasi_kegiatan bak
      ON bak.beasiswa_id = ba.id
    WHERE ba.aktif = TRUE
      AND bas.siswa_id = p_siswa_id
      AND bak.kegiatan_id = p_kegiatan_id
  );
$$;

-- 6. Recompute semua tagihan berdasarkan status beasiswa aktif
CREATE OR REPLACE FUNCTION public.refresh_tagihan_beasiswa()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  WITH recalculated AS (
    SELECT
      t.id AS tagihan_id,
      CASE
        WHEN public.is_beasiswa_administrasi_bebas(t.siswa_id, t.kegiatan_id) THEN 0
        ELSE COALESCE(kegiatan.nominal, 0)
      END AS jumlah_baru,
      COALESCE((
        SELECT SUM(p.jumlah)
        FROM public.pembayaran p
        WHERE p.tagihan_id = t.id
      ), 0) AS total_bayar,
      t.tanggal_jatuh_tempo
    FROM public.tagihan t
    INNER JOIN public.kegiatan_administrasi kegiatan
      ON kegiatan.id = t.kegiatan_id
  )
  UPDATE public.tagihan t
  SET
    jumlah = recalculated.jumlah_baru,
    status = CASE
      WHEN recalculated.jumlah_baru = 0 THEN 'paid'
      WHEN recalculated.total_bayar >= recalculated.jumlah_baru THEN 'paid'
      WHEN recalculated.tanggal_jatuh_tempo IS NOT NULL AND recalculated.tanggal_jatuh_tempo < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END,
    updated_at = NOW()
  FROM recalculated
  WHERE t.id = recalculated.tagihan_id;
END;
$$;

-- 7. Trigger wrapper untuk sinkronisasi tagihan saat data beasiswa berubah
CREATE OR REPLACE FUNCTION public.trigger_refresh_tagihan_beasiswa()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_tagihan_beasiswa();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_refresh_tagihan_beasiswa_master ON public.beasiswa_administrasi;
CREATE TRIGGER trigger_refresh_tagihan_beasiswa_master
AFTER INSERT OR UPDATE OR DELETE ON public.beasiswa_administrasi
FOR EACH ROW
EXECUTE FUNCTION public.trigger_refresh_tagihan_beasiswa();

DROP TRIGGER IF EXISTS trigger_refresh_tagihan_beasiswa_siswa ON public.beasiswa_administrasi_siswa;
CREATE TRIGGER trigger_refresh_tagihan_beasiswa_siswa
AFTER INSERT OR UPDATE OR DELETE ON public.beasiswa_administrasi_siswa
FOR EACH ROW
EXECUTE FUNCTION public.trigger_refresh_tagihan_beasiswa();

DROP TRIGGER IF EXISTS trigger_refresh_tagihan_beasiswa_kegiatan ON public.beasiswa_administrasi_kegiatan;
CREATE TRIGGER trigger_refresh_tagihan_beasiswa_kegiatan
AFTER INSERT OR UPDATE OR DELETE ON public.beasiswa_administrasi_kegiatan
FOR EACH ROW
EXECUTE FUNCTION public.trigger_refresh_tagihan_beasiswa();

-- 8. Update trigger tagihan generation agar tagihan beasiswa langsung 0 saat dibuat
CREATE OR REPLACE FUNCTION public.generate_tagihan_for_kegiatan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.tagihan (siswa_id, kegiatan_id, bulan, tahun, jumlah, status, tanggal_jatuh_tempo)
  SELECT
    siswa.id,
    NEW.kegiatan_id,
    EXTRACT(MONTH FROM NOW())::INT,
    EXTRACT(YEAR FROM NOW())::INT,
    CASE
      WHEN public.is_beasiswa_administrasi_bebas(siswa.id, NEW.kegiatan_id) THEN 0
      ELSE COALESCE(kegiatan.nominal, 0)
    END,
    CASE
      WHEN public.is_beasiswa_administrasi_bebas(siswa.id, NEW.kegiatan_id) THEN 'paid'
      ELSE 'pending'
    END,
    CURRENT_DATE + INTERVAL '30 days'
  FROM public.siswa siswa
  INNER JOIN public.kegiatan_administrasi kegiatan
    ON kegiatan.id = NEW.kegiatan_id
  WHERE siswa.kelas_id = NEW.kelas_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.tagihan t
      WHERE t.siswa_id = siswa.id
        AND t.kegiatan_id = NEW.kegiatan_id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN NEW;
END;
$$;

-- 9. RLS policies untuk tabel beasiswa
ALTER TABLE public.beasiswa_administrasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beasiswa_administrasi_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beasiswa_administrasi_kegiatan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bea_select" ON public.beasiswa_administrasi;
DROP POLICY IF EXISTS "bea_insert" ON public.beasiswa_administrasi;
DROP POLICY IF EXISTS "bea_update" ON public.beasiswa_administrasi;
DROP POLICY IF EXISTS "bea_delete" ON public.beasiswa_administrasi;
CREATE POLICY "bea_select" ON public.beasiswa_administrasi FOR SELECT USING (true);
CREATE POLICY "bea_insert" ON public.beasiswa_administrasi FOR INSERT WITH CHECK (true);
CREATE POLICY "bea_update" ON public.beasiswa_administrasi FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "bea_delete" ON public.beasiswa_administrasi FOR DELETE USING (true);

DROP POLICY IF EXISTS "beasiswa_select" ON public.beasiswa_administrasi_siswa;
DROP POLICY IF EXISTS "beasiswa_insert" ON public.beasiswa_administrasi_siswa;
DROP POLICY IF EXISTS "beasiswa_update" ON public.beasiswa_administrasi_siswa;
DROP POLICY IF EXISTS "beasiswa_delete" ON public.beasiswa_administrasi_siswa;
CREATE POLICY "beasiswa_select" ON public.beasiswa_administrasi_siswa FOR SELECT USING (true);
CREATE POLICY "beasiswa_insert" ON public.beasiswa_administrasi_siswa FOR INSERT WITH CHECK (true);
CREATE POLICY "beasiswa_update" ON public.beasiswa_administrasi_siswa FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "beasiswa_delete" ON public.beasiswa_administrasi_siswa FOR DELETE USING (true);

DROP POLICY IF EXISTS "beak_select" ON public.beasiswa_administrasi_kegiatan;
DROP POLICY IF EXISTS "beak_insert" ON public.beasiswa_administrasi_kegiatan;
DROP POLICY IF EXISTS "beak_update" ON public.beasiswa_administrasi_kegiatan;
DROP POLICY IF EXISTS "beak_delete" ON public.beasiswa_administrasi_kegiatan;
CREATE POLICY "beak_select" ON public.beasiswa_administrasi_kegiatan FOR SELECT USING (true);
CREATE POLICY "beak_insert" ON public.beasiswa_administrasi_kegiatan FOR INSERT WITH CHECK (true);
CREATE POLICY "beak_update" ON public.beasiswa_administrasi_kegiatan FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "beak_delete" ON public.beasiswa_administrasi_kegiatan FOR DELETE USING (true);

SELECT '✅ Migration 022 SUCCESS - Beasiswa administrasi added and tagihan sync enabled' AS status;
