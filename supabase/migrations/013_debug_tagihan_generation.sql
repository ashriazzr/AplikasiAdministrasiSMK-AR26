-- ===== MIGRATION 013: Fix Tagihan Generation - Debug & Test =====
-- Pastikan trigger berfungsi dengan benar

-- 1. Check trigger function exists
SELECT 'Current trigger function:' as check;
\df+ public.generate_tagihan_for_kegiatan

-- 2. Count siswa per kelas
SELECT 'Siswa per kelas:' as check;
SELECT 
  k.nama_kelas,
  COUNT(s.id) as jumlah_siswa
FROM kelas k
LEFT JOIN siswa s ON s.kelas_id = k.id
GROUP BY k.idx, k.nama_kelas
ORDER BY k.nama_kelas;

-- 3. Count kegiatan_kelas assignments
SELECT 'Kegiatan-Kelas assignments:' as check;
SELECT 
  COALESCE(gk.kegiatan_id, 'NO_ASSIGNMENT') as kegiatan_id,
  k.nama_kelas,
  COUNT(*) as count
FROM kegiatan_kelas gk
RIGHT JOIN kelas k ON gk.kelas_id = k.id
GROUP BY COALESCE(gk.kegiatan_id, 'NO_ASSIGNMENT'), k.idx, k.nama_kelas
ORDER BY k.nama_kelas;

-- 4. Count tagihan per kegiatan per kelas
SELECT 'Tagihan generated per kegiatan:' as check;
SELECT 
  gk.kegiatan_id,
  gk.kelas_id,
  k.nama_kelas,
  COUNT(t.id) as tagihan_count,
  COUNT(DISTINCT t.siswa_id) as siswa_count
FROM kegiatan_kelas gk
JOIN kelas k ON gk.kelas_id = k.id
LEFT JOIN tagihan t ON t.kegiatan_id = gk.kegiatan_id AND siswa IN (
  SELECT s.id FROM siswa s WHERE s.kelas_id = gk.kelas_id
)
GROUP BY gk.kegiatan_id, gk.kelas_id, k.idx, k.nama_kelas;

-- 5. Show expected vs actual tagihan count
SELECT 'Expected tagihan count:' as check;
SELECT 
  (SELECT COUNT(*) FROM siswa WHERE kelas_id = (SELECT id FROM kelas WHERE nama_kelas = 'mlm')) * 
  (SELECT COUNT(*) FROM kegiatan_kelas WHERE kelas_id = (SELECT id FROM kelas WHERE nama_kelas = 'mlm')) as expected_tagihan,
  (SELECT COUNT(*) FROM tagihan WHERE siswa_id IN (SELECT id FROM siswa WHERE kelas_id = (SELECT id FROM kelas WHERE nama_kelas = 'mlm'))) as actual_tagihan;
