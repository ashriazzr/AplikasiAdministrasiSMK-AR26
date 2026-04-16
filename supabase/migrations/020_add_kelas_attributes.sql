-- Migration: Add new attributes to kelas table
-- Purpose: Add kelas (class level X/XI/XII), jurusan (major TKJ/TKR), and tahun_ajaran (academic year) columns
-- Date: 2024

ALTER TABLE IF EXISTS kelas ADD COLUMN IF NOT EXISTS kelas VARCHAR(20);
ALTER TABLE IF EXISTS kelas ADD COLUMN IF NOT EXISTS jurusan VARCHAR(50);
ALTER TABLE IF EXISTS kelas ADD COLUMN IF NOT EXISTS tahun_ajaran VARCHAR(20);

-- Update timestamp
ALTER TABLE IF EXISTS kelas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

COMMENT ON COLUMN kelas.kelas IS 'Class level: X, XI, or XII';
COMMENT ON COLUMN kelas.jurusan IS 'Major: TKJ (Teknik Komputer dan Jaringan) or TKR (Teknik Kendaraan Ringan)';
COMMENT ON COLUMN kelas.tahun_ajaran IS 'Academic year in format: 2023/2024';
