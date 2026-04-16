-- ===== MIGRATION 016: Regenerate All Tagihan from Kegiatan-Kelas Relationships =====
-- Clean all tagihan dan rebuild berdasarkan kegiatan_kelas relationships

-- 1. DELETE all old tagihan
DELETE FROM public.tagihan;

-- 2. REGENERATE dari kegiatan_kelas: semua siswa × kegiatan yang di-assign ke kelas mereka
INSERT INTO public.tagihan (siswa_id, kegiatan_id, bulan, tahun, jumlah, status, tanggal_jatuh_tempo)
SELECT 
  s.id as siswa_id,
  gk.kegiatan_id,
  EXTRACT(MONTH FROM NOW())::int as bulan,
  EXTRACT(YEAR FROM NOW())::int as tahun,
  ga.nominal as jumlah,
  'pending' as status,
  CURRENT_DATE + INTERVAL '30 days' as tanggal_jatuh_tempo
FROM public.kegiatan_kelas gk
JOIN public.kegiatan_administrasi ga ON gk.kegiatan_id = ga.id
JOIN public.siswa s ON s.kelas_id = gk.kelas_id;

-- 3. Verify
SELECT '✅ Migration 016 SUCCESS - All tagihan regenerated' as status;
SELECT COUNT(*) as total_tagihan FROM tagihan;
SELECT s.nama, COUNT(DISTINCT t.kegiatan_id) as jumlah_kegiatan
FROM siswa s
LEFT JOIN tagihan t ON s.id = t.siswa_id
GROUP BY s.id, s.nama
ORDER BY s.nama;
