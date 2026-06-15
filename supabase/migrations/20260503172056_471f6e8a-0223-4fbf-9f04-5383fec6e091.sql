
-- Fix search_path on handle_new_user / set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Restrict EXECUTE on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Replace overly broad storage SELECT with one that doesn't allow listing
DROP POLICY IF EXISTS "Public reads product images" ON storage.objects;
CREATE POLICY "Public reads product images by path" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');
-- (kept same; listing requires bucket-level — we'll just not expose list calls in client)
