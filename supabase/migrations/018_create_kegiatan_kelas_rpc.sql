-- ===== MIGRATION 018: Create RPC Functions for kegiatan_kelas Management =====
-- These RPC functions ensure all students in a class get tagihan when kegiatan is added

-- 1. Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.upsert_kegiatan_kelas(uuid, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.sync_kegiatan_kelas(uuid, uuid[]) CASCADE;

-- 2. Create upsert_kegiatan_kelas - adds kelas to kegiatan and generates tagihan
CREATE OR REPLACE FUNCTION public.upsert_kegiatan_kelas(
  p_kegiatan_id uuid,
  p_kelas_ids uuid[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_kelas_id uuid;
  v_inserted_count int = 0;
  v_tagihan_count int = 0;
BEGIN
  -- Insert each kelas into kegiatan_kelas (will trigger tagihan generation)
  FOREACH v_kelas_id IN ARRAY p_kelas_ids
  LOOP
    -- Insert or ignore if already exists
    INSERT INTO public.kegiatan_kelas (kegiatan_id, kelas_id)
    VALUES (p_kegiatan_id, v_kelas_id)
    ON CONFLICT (kegiatan_id, kelas_id) DO NOTHING;
    
    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  -- Get count of tagihan created
  SELECT COUNT(*) INTO v_tagihan_count 
  FROM public.tagihan 
  WHERE kegiatan_id = p_kegiatan_id;

  RETURN json_build_object(
    'success', true,
    'kelas_count', v_inserted_count,
    'tagihan_count', v_tagihan_count,
    'message', 'Kelas berhasil ditambahkan dan tagihan digenerate'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Gagal menambahkan kelas'
  );
END;
$function$;

-- 3. Create sync_kegiatan_kelas - sync kelas for kegiatan (removes old, adds new)
CREATE OR REPLACE FUNCTION public.sync_kegiatan_kelas(
  p_kegiatan_id uuid,
  p_kelas_ids uuid[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_kelas_id uuid;
  v_deleted_count int = 0;
  v_inserted_count int = 0;
  v_tagihan_count int = 0;
BEGIN
  -- First delete kelas that are no longer in the list
  DELETE FROM public.kegiatan_kelas
  WHERE kegiatan_id = p_kegiatan_id
    AND kelas_id NOT IN (SELECT UNNEST(p_kelas_ids));
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Then insert/ensure all kelas from new list
  FOREACH v_kelas_id IN ARRAY p_kelas_ids
  LOOP
    INSERT INTO public.kegiatan_kelas (kegiatan_id, kelas_id)
    VALUES (p_kegiatan_id, v_kelas_id)
    ON CONFLICT (kegiatan_id, kelas_id) DO NOTHING;
    
    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  -- Get count of tagihan for this kegiatan
  SELECT COUNT(*) INTO v_tagihan_count 
  FROM public.tagihan 
  WHERE kegiatan_id = p_kegiatan_id;

  RETURN json_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'inserted_count', v_inserted_count,
    'tagihan_count', v_tagihan_count,
    'message', 'Sinkronisasi kelas dan tagihan berhasil'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Gagal mensinkronisasi kelas'
  );
END;
$function$;

-- 4. Verify functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('upsert_kegiatan_kelas', 'sync_kegiatan_kelas')
ORDER BY routine_name;

SELECT '✅ Migration 018 SUCCESS - RPC functions created' as status;
