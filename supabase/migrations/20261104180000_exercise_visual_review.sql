alter table public.exercises
  add column visual_review_status text not null default 'pending',
  add column media_rights_note text,
  add column technical_reviewer text,
  add column visual_reviewed_by uuid references public.profiles(id),
  add column visual_reviewed_at timestamptz;

alter table public.exercises
  add constraint exercises_visual_review_status check (visual_review_status in ('pending', 'approved')),
  add constraint exercises_media_rights_note_length check (media_rights_note is null or char_length(media_rights_note) <= 1000),
  add constraint exercises_technical_reviewer_length check (technical_reviewer is null or char_length(technical_reviewer) <= 160),
  add constraint exercises_visual_approval_complete check (
    visual_review_status = 'pending' or
    (nullif(btrim(image_url), '') is not null
      and nullif(btrim(video_url), '') is not null
      and nullif(btrim(anatomy_image_url), '') is not null
      and nullif(btrim(instructions), '') is not null
      and nullif(btrim(coaching_tip), '') is not null
      and nullif(btrim(common_mistakes), '') is not null
      and nullif(btrim(media_rights_note), '') is not null
      and nullif(btrim(technical_reviewer), '') is not null
      and visual_reviewed_by is not null
      and visual_reviewed_at is not null)
  );

create function public.protect_exercise_visual_review()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if (new.visual_review_status <> 'pending' or new.media_rights_note is not null
        or new.technical_reviewer is not null or new.visual_reviewed_by is not null
        or new.visual_reviewed_at is not null) and not public.is_admin() then
      raise exception 'Only administrators can review exercise visuals';
    end if;
  else
    if (new.visual_review_status, new.media_rights_note, new.technical_reviewer,
        new.visual_reviewed_by, new.visual_reviewed_at) is distinct from
       (old.visual_review_status, old.media_rights_note, old.technical_reviewer,
        old.visual_reviewed_by, old.visual_reviewed_at) and not public.is_admin() then
      raise exception 'Only administrators can review exercise visuals';
    end if;
    if old.visual_review_status = 'approved' and new.visual_review_status = 'approved'
       and (new.name, new.description, new.muscle_group, new.secondary_muscles,
            new.equipment, new.instructions, new.image_url, new.video_url,
            new.anatomy_image_url, new.coaching_tip, new.common_mistakes)
           is distinct from
           (old.name, old.description, old.muscle_group, old.secondary_muscles,
            old.equipment, old.instructions, old.image_url, old.video_url,
            old.anatomy_image_url, old.coaching_tip, old.common_mistakes) then
      raise exception 'Visual approval must be reset before revising exercise content';
    end if;
  end if;
  return new;
end;
$$;

create trigger exercises_protect_visual_review
before insert or update on public.exercises
for each row execute function public.protect_exercise_visual_review();
