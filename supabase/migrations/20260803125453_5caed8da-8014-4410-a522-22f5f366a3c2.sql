CREATE POLICY "attendance_revision_requests_auth_insert"
ON public.attendance_revision_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requested_by);