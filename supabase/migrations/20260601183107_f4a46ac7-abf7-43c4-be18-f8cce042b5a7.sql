DROP POLICY IF EXISTS "Anyone views active products" ON public.products;

CREATE POLICY "Anyone views active products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins view all products"
ON public.products
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;