-- Compatibility migration: map external schema (classes, students)
-- into app schema (kelas, siswa)
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Ensure target table `kelas` exists with expected columns.
CREATE TABLE IF NOT EXISTS public.kelas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_kelas VARCHAR(100) NOT NULL,
  tingkat VARCHAR(20) NOT NULL,
  wali_kelas VARCHAR(100),
  kelas VARCHAR(20),
  jurusan VARCHAR(50),
  tahun_ajaran VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.kelas ADD COLUMN IF NOT EXISTS nama_kelas VARCHAR(100);
ALTER TABLE public.kelas ADD COLUMN IF NOT EXISTS tingkat VARCHAR(20);
ALTER TABLE public.kelas ADD COLUMN IF NOT EXISTS wali_kelas VARCHAR(100);
ALTER TABLE public.kelas ADD COLUMN IF NOT EXISTS kelas VARCHAR(20);
ALTER TABLE public.kelas ADD COLUMN IF NOT EXISTS jurusan VARCHAR(50);
ALTER TABLE public.kelas ADD COLUMN IF NOT EXISTS tahun_ajaran VARCHAR(20);
ALTER TABLE public.kelas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.kelas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2) Import class data from `classes` when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'classes'
  ) THEN
    INSERT INTO public.kelas (id, nama_kelas, tingkat, wali_kelas, kelas, created_at, updated_at)
    SELECT
      c.id,
      c.name,
      COALESCE(NULLIF(c.level, ''), 'X'),
      c.homeroom,
      c.level,
      COALESCE(c.created_at, NOW()),
      COALESCE(c.updated_at, NOW())
    FROM public.classes c
    ON CONFLICT (id) DO UPDATE
      SET nama_kelas = EXCLUDED.nama_kelas,
          tingkat = EXCLUDED.tingkat,
          wali_kelas = EXCLUDED.wali_kelas,
          kelas = EXCLUDED.kelas,
          updated_at = NOW();
  END IF;
END $$;

-- 3) Ensure target table `siswa` exists with expected columns.
CREATE TABLE IF NOT EXISTS public.siswa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama VARCHAR(150) NOT NULL,
  kelas_id UUID,
  nis VARCHAR(50) UNIQUE,
  nisn VARCHAR(50),
  jenis_kelamin VARCHAR(20),
  tanggal_lahir DATE,
  alamat TEXT,
  asal_sekolah VARCHAR(200),
  rfid_card VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS nama VARCHAR(150);
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS kelas_id UUID;
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS nis VARCHAR(50);
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS nisn VARCHAR(50);
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS jenis_kelamin VARCHAR(20);
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS tanggal_lahir DATE;
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS asal_sekolah VARCHAR(200);
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS rfid_card VARCHAR(100);
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.siswa ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4) Import student data from `students` when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'students'
  ) THEN
    INSERT INTO public.siswa (
      id,
      nama,
      kelas_id,
      nis,
      nisn,
      jenis_kelamin,
      alamat,
      asal_sekolah,
      created_at,
      updated_at
    )
    SELECT
      s.id,
      s.name,
      s.class_id,
      CONCAT('AUTO-', SUBSTRING(REPLACE(s.id::text, '-', '') FROM 1 FOR 12)),
      NULLIF(s.nisn, ''),
      NULLIF(s.gender, ''),
      '-',
      '-',
      COALESCE(s.created_at, NOW()),
      COALESCE(s.updated_at, NOW())
    FROM public.students s
    ON CONFLICT (id) DO UPDATE
      SET nama = EXCLUDED.nama,
          kelas_id = EXCLUDED.kelas_id,
          nisn = EXCLUDED.nisn,
          jenis_kelamin = EXCLUDED.jenis_kelamin,
          updated_at = NOW();
  END IF;
END $$;

-- 5) Backfill defaults for required app fields.
UPDATE public.siswa
SET
  nis = COALESCE(NULLIF(nis, ''), CONCAT('AUTO-', SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 12))),
  alamat = COALESCE(NULLIF(alamat, ''), '-'),
  asal_sekolah = COALESCE(NULLIF(asal_sekolah, ''), '-')
WHERE nis IS NULL OR nis = '' OR alamat IS NULL OR alamat = '' OR asal_sekolah IS NULL OR asal_sekolah = '';

-- 6) Ensure relation and unique constraints for app usage.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'siswa_kelas_id_fkey'
      AND conrelid = 'public.siswa'::regclass
  ) THEN
    ALTER TABLE public.siswa
      ADD CONSTRAINT siswa_kelas_id_fkey
      FOREIGN KEY (kelas_id) REFERENCES public.kelas(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_siswa_nis_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_siswa_nis_unique ON public.siswa (nis);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_kelas_nama_kelas'
  ) THEN
    CREATE INDEX idx_kelas_nama_kelas ON public.kelas (nama_kelas);
  END IF;
END $$;

-- 7) Keep old table names available as read-only compatibility views.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'classes_compat'
  ) THEN
    EXECUTE '
      CREATE VIEW public.classes_compat AS
      SELECT
        id,
        nama_kelas AS name,
        COALESCE(kelas, tingkat) AS level,
        wali_kelas AS homeroom,
        created_at,
        updated_at
      FROM public.kelas
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'students_compat'
  ) THEN
    EXECUTE '
      CREATE VIEW public.students_compat AS
      SELECT
        id,
        nama AS name,
        nisn,
        jenis_kelamin AS gender,
        NULL::text AS phone,
        COALESCE(kelas_id::text, '''') AS class,
        kelas_id AS class_id,
        created_at,
        updated_at,
        NULL::text AS face_image,
        NULL::jsonb AS face_descriptor,
        NULL::timestamptz AS face_enrolled_at
      FROM public.siswa
    ';
  END IF;
END $$;
