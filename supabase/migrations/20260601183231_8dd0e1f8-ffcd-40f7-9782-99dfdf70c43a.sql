DROP POLICY IF EXISTS "Public reads product images by path" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete product images" ON storage.objects;

CREATE POLICY "Admins upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ((bucket_id = 'products') AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING ((bucket_id = 'products') AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING ((bucket_id = 'products') AND private.has_role(auth.uid(), 'admin'::public.app_role));