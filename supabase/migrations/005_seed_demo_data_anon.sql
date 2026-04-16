-- ===== MIGRATION 005 (UPDATED): Seed Demo Data - Anon Mode Version =====

-- 1. Create kelas
INSERT INTO public.kelas (nama_kelas, tingkat, wali_kelas) 
VALUES 
  ('XII IPA 1', '12', 'Bu Siti'),
  ('XII IPA 2', '12', 'Pak Ahmad'),
  ('XI IPA 1', '11', 'Ibu Nur')
ON CONFLICT DO NOTHING;

-- 2. Create siswa
DO $$
DECLARE
  kelas_xii_ipa_1 UUID;
BEGIN
  SELECT id INTO kelas_xii_ipa_1 FROM kelas WHERE nama_kelas = 'XII IPA 1' LIMIT 1;

  INSERT INTO siswa (nama, nis, kelas_id, jenis_kelamin, alamat) 
  VALUES 
    ('Ahmad Reza', '2024001', kelas_xii_ipa_1, 'Laki-laki', 'Jl. Merdeka'),
    ('Siti Nurhaliza', '2024002', kelas_xii_ipa_1, 'Perempuan', 'Jl. Diponegoro')
  ON CONFLICT (nis) DO NOTHING;
END $$;

-- 3. Create kegiatan (without created_by FK)
INSERT INTO public.kegiatan_administrasi (nama_kegiatan, nominal, tanggal_mulai, status, created_by) 
VALUES 
  ('Ujian Semester 1', 150000, CURRENT_DATE, 'pending', 'Admin Demo'),
  ('Studi Wisata', 250000, CURRENT_DATE, 'pending', 'Admin Demo')
ON CONFLICT DO NOTHING;

-- 4. Create kegiatan_kelas relationships
DO $$
DECLARE
  kelas_xii_ipa_1 UUID;
BEGIN
  SELECT id INTO kelas_xii_ipa_1 FROM kelas WHERE nama_kelas = 'XII IPA 1' LIMIT 1;

  INSERT INTO kegiatan_kelas (kegiatan_id, kelas_id)
  SELECT g.id, kelas_xii_ipa_1
  FROM kegiatan_administrasi g
  WHERE g.nama_kegiatan IN ('Ujian Semester 1', 'Studi Wisata')
  ON CONFLICT DO NOTHING;
END $$;

-- 5. Create akun pembayaran
INSERT INTO public.akun_pembayaran (nama_akun, jenis_akun, saldo, keterangan) 
VALUES 
  ('Kas Sekolah', 'kas', 0, 'Kas tunai sekolah'),
  ('Bank BRI', 'bank', 0, 'Rekening BRI Sekolah'),
  ('E-Wallet', 'dompet_digital', 0, 'Dompet digital')
ON CONFLICT DO NOTHING;

-- ===== VERIFY =====
SELECT 'Total Kelas' as type, COUNT(*) as count FROM kelas
UNION ALL SELECT 'Total Siswa', COUNT(*) FROM siswa
UNION ALL SELECT 'Total Kegiatan', COUNT(*) FROM kegiatan_administrasi
UNION ALL SELECT 'Total Kegiatan-Kelas', COUNT(*) FROM kegiatan_kelas
UNION ALL SELECT 'Total Akun', COUNT(*) FROM akun_pembayaran;

SELECT '✅ Migration 005 SUCCESS - Demo data seeded (anon mode)' as status;
