-- Contrainte max 3 badges épinglés par utilisateur
-- + index pour les lookups rapides

create index if not exists user_badges_pinned_user_idx
  on public.user_badges (user_id)
  where is_pinned = true;

-- RLS : permettre UPDATE de is_pinned par le propriétaire
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_badges' and policyname = 'user_badges owner pin'
  ) then
    execute 'create policy "user_badges owner pin" on public.user_badges for update using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
end $$;

-- Trigger : empêcher plus de 3 is_pinned = true par user
create or replace function public.check_max_pinned_badges()
returns trigger
language plpgsql
as $$
begin
  if NEW.is_pinned = true then
    if (
      select count(*)
      from public.user_badges
      where user_id = NEW.user_id
        and is_pinned = true
        and id != NEW.id
    ) >= 3 then
      raise exception 'Maximum 3 badges épinglés par utilisateur';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_max_pinned_badges on public.user_badges;
create trigger trg_max_pinned_badges
  before insert or update on public.user_badges
  for each row execute function public.check_max_pinned_badges();
