alter table public.exercises
  add column if not exists anatomy_image_url text;

alter table public.exercises
  add constraint exercises_anatomy_image_url_length
  check (anatomy_image_url is null or char_length(anatomy_image_url) <= 2048);
