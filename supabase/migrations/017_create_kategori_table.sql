-- ===== MIGRATION 017: Create Kategori Table for Cashflow Categories =====

CREATE TABLE IF NOT EXISTS public.kategori (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nama_kategori character varying NOT NULL UNIQUE,
  jenis character varying NOT NULL CHECK (jenis::text = ANY (ARRAY['income'::character varying, 'expense'::character varying])),
  warna character varying DEFAULT '#6366f1',
  icon character varying DEFAULT 'tag',
  urutan integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT kategori_pkey PRIMARY KEY (id)
);

-- Add kategori_id to cashflow table
ALTER TABLE public.cashflow 
ADD COLUMN IF NOT EXISTS kategori_id uuid REFERENCES public.kategori(id);

-- Seed default categories
INSERT INTO public.kategori (nama_kategori, jenis, warna, icon, urutan) 
VALUES 
  ('Pemasukan Siswa', 'income', '#10b981', 'arrow-up-right', 1),
  ('Pemasukan Lainnya', 'income', '#06b6d4', 'arrow-up-right', 2),
  ('Gaji & Operasional', 'expense', '#ef4444', 'users', 10),
  ('Makanan & Minuman', 'expense', '#f97316', 'utensils', 11),
  ('Transport', 'expense', '#8b5cf6', 'truck', 12),
  ('Listrik & Air', 'expense', '#eab308', 'zap', 13),
  ('Perawatan Bangunan', 'expense', '#6366f1', 'hammer', 14),
  ('Alat & Perlengkapan', 'expense', '#14b8a6', 'briefcase', 15),
  ('Komunikasi & Internet', 'expense', '#06b6d4', 'phone', 16),
  ('Lainnya', 'expense', '#64748b', 'question-mark', 99)
ON CONFLICT DO NOTHING;

-- Enable RLS on kategori
ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow anon to read all categories
CREATE POLICY kategori_read_anon ON public.kategori
  FOR SELECT USING (true);

-- RLS Policy: Allow anon to insert/update/delete (for management)
CREATE POLICY kategori_write_anon ON public.kategori
  FOR INSERT WITH CHECK (true);

CREATE POLICY kategori_update_anon ON public.kategori
  FOR UPDATE USING (true);

CREATE POLICY kategori_delete_anon ON public.kategori
  FOR DELETE USING (true);

SELECT '✅ Migration 017 SUCCESS - Kategori table created' as status;
