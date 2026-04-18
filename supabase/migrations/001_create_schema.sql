-- Sistem Administrasi Siswa - Database Schema
-- PostgreSQL Migration Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create kelas table
CREATE TABLE IF NOT EXISTS kelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_kelas VARCHAR(100) NOT NULL,
  tingkat VARCHAR(20) NOT NULL,
  wali_kelas VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create siswa table
CREATE TABLE IF NOT EXISTS siswa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama VARCHAR(150) NOT NULL,
  kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  nis VARCHAR(50) UNIQUE NOT NULL,
  nisn VARCHAR(50),
  jenis_kelamin VARCHAR(20),
  tanggal_lahir DATE,
  alamat TEXT,
  asal_sekolah VARCHAR(200),
  du_di VARCHAR(200),
  rfid_card VARCHAR(100) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to siswa table if they don't exist
ALTER TABLE IF EXISTS siswa ADD COLUMN IF NOT EXISTS nisn VARCHAR(50);
ALTER TABLE IF EXISTS siswa ADD COLUMN IF NOT EXISTS asal_sekolah VARCHAR(200);
ALTER TABLE IF EXISTS siswa ADD COLUMN IF NOT EXISTS du_di VARCHAR(200);

-- Create administrasi table
CREATE TABLE IF NOT EXISTS administrasi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nama VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  jabatan VARCHAR(100) NOT NULL,
  telepon VARCHAR(20),
  tanggal_bergabung DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for user_id (FIX: Masalah 3)
CREATE INDEX IF NOT EXISTS idx_administrasi_user_id ON administrasi(user_id);

-- Create tagihan table
CREATE TABLE IF NOT EXISTS tagihan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  bulan INTEGER NOT NULL,
  tahun INTEGER NOT NULL,
  jumlah DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  tanggal_jatuh_tempo DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(siswa_id, bulan, tahun)
);

-- Create pembayaran table
CREATE TABLE IF NOT EXISTS pembayaran (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tagihan_id UUID NOT NULL REFERENCES tagihan(id) ON DELETE CASCADE,
  siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  jumlah DECIMAL(12, 2) NOT NULL,
  metode_pembayaran VARCHAR(50) NOT NULL,
  tanggal_pembayaran TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  bukti_pembayaran VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rfid_logs table
CREATE TABLE IF NOT EXISTS rfid_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfid_card VARCHAR(100) NOT NULL,
  siswa_id UUID REFERENCES siswa(id) ON DELETE SET NULL,
  tipe_scan VARCHAR(30) DEFAULT 'masuk' CHECK (tipe_scan IN ('masuk', 'keluar', 'lihat_tagihan')),
  waktu_masuk TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  waktu_keluar TIMESTAMP WITH TIME ZONE,
  tanggal DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create kegiatan_administrasi table
CREATE TABLE IF NOT EXISTS kegiatan_administrasi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_kegiatan VARCHAR(200) NOT NULL,
  nominal DECIMAL(12, 2),
  deskripsi TEXT,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for kegiatan_administrasi and kelas relationship (FIX: Masalah 2)
-- Using composite primary key (kegiatan_id, kelas_id) to prevent duplicates naturally
CREATE TABLE IF NOT EXISTS kegiatan_kelas (
  kegiatan_id UUID NOT NULL REFERENCES kegiatan_administrasi(id) ON DELETE CASCADE,
  kelas_id UUID NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  PRIMARY KEY (kegiatan_id, kelas_id)
);

-- Add index for junction table
CREATE INDEX IF NOT EXISTS idx_kegiatan_kelas_kegiatan ON kegiatan_kelas(kegiatan_id);
CREATE INDEX IF NOT EXISTS idx_kegiatan_kelas_kelas ON kegiatan_kelas(kelas_id);

-- Drop old kelas_ids column if it exists to avoid conflicts
ALTER TABLE IF EXISTS kegiatan_administrasi DROP COLUMN IF EXISTS kelas_ids;

-- Create akun_pembayaran table for storing payment accounts/wallets
CREATE TABLE IF NOT EXISTS akun_pembayaran (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_akun VARCHAR(150) NOT NULL,
  jenis_akun VARCHAR(100) NOT NULL,
  saldo DECIMAL(15, 2) DEFAULT 0,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pengeluaran table (FIX: Missing RFID warning)
CREATE TABLE IF NOT EXISTS pengeluaran (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kegiatan_id UUID NOT NULL REFERENCES kegiatan_administrasi(id) ON DELETE CASCADE,
  deskripsi VARCHAR(200) NOT NULL,
  jumlah DECIMAL(12, 2) NOT NULL,
  tanggal TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  kategori VARCHAR(50) DEFAULT 'operasional',
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cashflow table (FIX: Masalah 1 - referensi_id should be pembayaran_id)
CREATE TABLE IF NOT EXISTS cashflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal DATE DEFAULT CURRENT_DATE,
  jenis_transaksi VARCHAR(50) NOT NULL CHECK (jenis_transaksi IN ('income', 'expense')),
  kategori VARCHAR(100) NOT NULL,
  jumlah DECIMAL(15, 2) NOT NULL,
  deskripsi TEXT,
  akun_pembayaran_id UUID REFERENCES akun_pembayaran(id) ON DELETE SET NULL,
  pembayaran_id UUID REFERENCES pembayaran(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_siswa_kelas_id ON siswa(kelas_id);
CREATE INDEX IF NOT EXISTS idx_siswa_rfid_card ON siswa(rfid_card);
CREATE INDEX IF NOT EXISTS idx_tagihan_siswa_id ON tagihan(siswa_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_status ON tagihan(status);
CREATE INDEX IF NOT EXISTS idx_pembayaran_siswa_id ON pembayaran(siswa_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_tagihan_id ON pembayaran(tagihan_id);
CREATE INDEX IF NOT EXISTS idx_rfid_logs_siswa_id ON rfid_logs(siswa_id);
CREATE INDEX IF NOT EXISTS idx_rfid_logs_tanggal ON rfid_logs(tanggal);
CREATE INDEX IF NOT EXISTS idx_cashflow_tanggal ON cashflow(tanggal);
CREATE INDEX IF NOT EXISTS idx_cashflow_akun ON cashflow(akun_pembayaran_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_pembayaran ON cashflow(pembayaran_id);
CREATE INDEX IF NOT EXISTS idx_siswa_nisn ON siswa(nisn);
CREATE INDEX IF NOT EXISTS idx_siswa_asal_sekolah ON siswa(asal_sekolah);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_kegiatan ON pengeluaran(kegiatan_id);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_tanggal ON pengeluaran(tanggal);

-- Create trigger function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER trigger_update_kelas_updated_at BEFORE UPDATE ON kelas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_siswa_updated_at BEFORE UPDATE ON siswa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_administrasi_updated_at BEFORE UPDATE ON administrasi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_tagihan_updated_at BEFORE UPDATE ON tagihan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_pembayaran_updated_at BEFORE UPDATE ON pembayaran
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_kegiatan_updated_at BEFORE UPDATE ON kegiatan_administrasi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_pengeluaran_updated_at BEFORE UPDATE ON pengeluaran
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_cashflow_updated_at BEFORE UPDATE ON cashflow
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_akun_pembayaran_updated_at BEFORE UPDATE ON akun_pembayaran
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for auto-update overdue tagihan
CREATE OR REPLACE FUNCTION check_and_update_overdue()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status to 'overdue' if tanggal_jatuh_tempo sudah lewat dan belum dibayar
  IF NEW.status = 'pending' AND NEW.tanggal_jatuh_tempo IS NOT NULL AND NEW.tanggal_jatuh_tempo < CURRENT_DATE THEN
    NEW.status = 'overdue';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger saat insert tagihan
CREATE TRIGGER trigger_check_overdue_insert BEFORE INSERT ON tagihan
  FOR EACH ROW EXECUTE FUNCTION check_and_update_overdue();

-- Trigger saat update tagihan
CREATE TRIGGER trigger_check_overdue_update BEFORE UPDATE ON tagihan
  FOR EACH ROW EXECUTE FUNCTION check_and_update_overdue();

-- Enable RLS for new tables
ALTER TABLE kegiatan_kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengeluaran ENABLE ROW LEVEL SECURITY;

-- Create public policies (allow all for authenticated users)
-- Note: Update these policies based on your security requirements

-- Kelas policies
CREATE POLICY "Enable all for kelas" ON kelas
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Siswa policies
CREATE POLICY "Enable all for siswa" ON siswa
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Administrasi policies (FIX: Masalah 3 - Only TU can see their own data)
DROP POLICY IF EXISTS "Enable all for administrasi" ON administrasi;
CREATE POLICY "TU lihat data sendiri" ON administrasi
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for administrasi" ON administrasi
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Enable update for administrasi" ON administrasi
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable delete for administrasi" ON administrasi
  FOR DELETE USING (auth.uid() = user_id);

-- Tagihan policies
CREATE POLICY "Enable all for tagihan" ON tagihan
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Pembayaran policies
CREATE POLICY "Enable all for pembayaran" ON pembayaran
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- RFID logs policies
CREATE POLICY "Enable all for rfid_logs" ON rfid_logs
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Kegiatan administrasi policies
CREATE POLICY "Enable all for kegiatan_administrasi" ON kegiatan_administrasi
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Kegiatan Kelas junction table policies (NEW)
CREATE POLICY "Enable all for kegiatan_kelas" ON kegiatan_kelas
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Pengeluaran policies (NEW)
CREATE POLICY "Enable all for pengeluaran" ON pengeluaran
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Cashflow policies
CREATE POLICY "Enable all for cashflow" ON cashflow
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Akun pembayaran policies
CREATE POLICY "Enable all for akun_pembayaran" ON akun_pembayaran
  FOR ALL USING (TRUE) WITH CHECK (TRUE);
