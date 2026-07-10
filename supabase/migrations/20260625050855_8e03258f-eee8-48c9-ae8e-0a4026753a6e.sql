
-- Pastikan admin memiliki akses CRUD penuh pada profiles & user_roles
DROP POLICY IF EXISTS "admin full access profiles" ON public.profiles;
CREATE POLICY "admin full access profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin full access user_roles" ON public.user_roles;
CREATE POLICY "admin full access user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
