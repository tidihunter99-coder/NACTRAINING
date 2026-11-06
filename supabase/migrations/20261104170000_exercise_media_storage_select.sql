-- Supabase Storage checks SELECT as well as DELETE when removing an object.
-- Access remains limited to administrators and this dedicated bucket.
create policy nac_exercise_media_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'nac-exercise-media' and public.is_admin());
