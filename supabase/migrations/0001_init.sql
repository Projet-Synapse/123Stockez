-- Powered by OnSpace.AI — 123Stockez base schema
-- Apply with:  supabase db push        (or paste into the SQL editor)

create extension if not exists "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════════
-- User profiles — mirrors auth.users so the app can read a display name
-- without hitting the auth schema.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.user_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  username    text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, username, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- Gallery: groups → albums → photos
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  color       text not null default '#7C5CFC',
  cover_photo text,
  album_count integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.albums (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  group_id    uuid not null references public.groups (id) on delete cascade,
  name        text not null,
  description text,
  cover_photo text,
  photo_count integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  album_id     uuid not null references public.albums (id) on delete cascade,
  group_id     uuid not null references public.groups (id) on delete cascade,
  storage_path text not null,
  name         text not null default '',
  caption      text,
  created_at   timestamptz not null default now()
);

create index if not exists groups_user_idx  on public.groups (user_id, created_at desc);
create index if not exists albums_user_idx  on public.albums (user_id, created_at desc);
create index if not exists albums_group_idx on public.albums (group_id, created_at desc);
create index if not exists photos_user_idx  on public.photos (user_id, created_at desc);
create index if not exists photos_album_idx on public.photos (album_id, created_at desc);
create index if not exists photos_group_idx on public.photos (group_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Carnets: user-defined record books with custom fields
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.carnets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  emoji       text not null default '📓',
  cover_photo text,
  entry_count integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.carnet_fields (
  id        uuid primary key default gen_random_uuid(),
  carnet_id uuid not null references public.carnets (id) on delete cascade,
  label     text not null,
  type      text not null default 'text' check (type in ('text', 'number')),
  position  integer not null default 0
);

create table if not exists public.carnet_entries (
  id           uuid primary key default gen_random_uuid(),
  carnet_id    uuid not null references public.carnets (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  name         text not null default '',
  description  text,
  created_at   timestamptz not null default now()
);

create table if not exists public.carnet_entry_values (
  entry_id uuid not null references public.carnet_entries (id) on delete cascade,
  field_id uuid not null references public.carnet_fields (id) on delete cascade,
  value    text not null default '',
  primary key (entry_id, field_id)
);

create index if not exists carnets_user_idx         on public.carnets (user_id, created_at desc);
create index if not exists carnet_fields_carnet_idx on public.carnet_fields (carnet_id, position);
create index if not exists carnet_entries_carnet_idx on public.carnet_entries (carnet_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- Denormalised counters and covers, maintained server-side so no client can
-- drift them out of sync.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.refresh_album_stats(target_album uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.albums a
     set photo_count = coalesce(s.cnt, 0),
         cover_photo = s.cover
    from (
      select count(*) as cnt,
             (select p2.storage_path from public.photos p2
               where p2.album_id = target_album
               order by p2.created_at desc limit 1) as cover
        from public.photos p where p.album_id = target_album
    ) s
   where a.id = target_album;
end;
$$;

create or replace function public.refresh_group_stats(target_group uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.groups g
     set album_count = coalesce(s.cnt, 0),
         cover_photo = s.cover
    from (
      select count(*) as cnt,
             (select a2.cover_photo from public.albums a2
               where a2.group_id = target_group and a2.cover_photo is not null
               order by a2.created_at desc limit 1) as cover
        from public.albums a where a.group_id = target_group
    ) s
   where g.id = target_group;
end;
$$;

create or replace function public.refresh_carnet_stats(target_carnet uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.carnets c
     set entry_count = coalesce(s.cnt, 0),
         cover_photo = s.cover
    from (
      select count(*) as cnt,
             (select e2.storage_path from public.carnet_entries e2
               where e2.carnet_id = target_carnet
               order by e2.created_at desc limit 1) as cover
        from public.carnet_entries e where e.carnet_id = target_carnet
    ) s
   where c.id = target_carnet;
end;
$$;

create or replace function public.photos_stats_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_album_stats(new.album_id);
    perform public.refresh_group_stats(new.group_id);
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    perform public.refresh_album_stats(old.album_id);
    perform public.refresh_group_stats(old.group_id);
  end if;
  return null;
end;
$$;

create or replace function public.albums_stats_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_group_stats(new.group_id);
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    perform public.refresh_group_stats(old.group_id);
  end if;
  return null;
end;
$$;

create or replace function public.carnet_entries_stats_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_carnet_stats(new.carnet_id);
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    perform public.refresh_carnet_stats(old.carnet_id);
  end if;
  return null;
end;
$$;

drop trigger if exists photos_stats on public.photos;
create trigger photos_stats after insert or update or delete on public.photos
  for each row execute function public.photos_stats_trigger();

drop trigger if exists albums_stats on public.albums;
create trigger albums_stats after insert or update or delete on public.albums
  for each row execute function public.albums_stats_trigger();

drop trigger if exists carnet_entries_stats on public.carnet_entries;
create trigger carnet_entries_stats after insert or update or delete on public.carnet_entries
  for each row execute function public.carnet_entries_stats_trigger();

-- ═══════════════════════════════════════════════════════════════════════════
-- Row level security — every row is private to the user who owns it.
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.user_profiles      enable row level security;
alter table public.groups             enable row level security;
alter table public.albums             enable row level security;
alter table public.photos             enable row level security;
alter table public.carnets            enable row level security;
alter table public.carnet_fields      enable row level security;
alter table public.carnet_entries     enable row level security;
alter table public.carnet_entry_values enable row level security;

drop policy if exists "profiles are self-service" on public.user_profiles;
create policy "profiles are self-service" on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "groups are owner-only" on public.groups;
create policy "groups are owner-only" on public.groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "albums are owner-only" on public.albums;
create policy "albums are owner-only" on public.albums
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "photos are owner-only" on public.photos;
create policy "photos are owner-only" on public.photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "carnets are owner-only" on public.carnets;
create policy "carnets are owner-only" on public.carnets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fields and values inherit ownership from their parent carnet / entry.
drop policy if exists "carnet fields follow their carnet" on public.carnet_fields;
create policy "carnet fields follow their carnet" on public.carnet_fields
  for all using (
    exists (select 1 from public.carnets c where c.id = carnet_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.carnets c where c.id = carnet_id and c.user_id = auth.uid())
  );

drop policy if exists "carnet entries are owner-only" on public.carnet_entries;
create policy "carnet entries are owner-only" on public.carnet_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "entry values follow their entry" on public.carnet_entry_values;
create policy "entry values follow their entry" on public.carnet_entry_values
  for all using (
    exists (select 1 from public.carnet_entries e where e.id = entry_id and e.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.carnet_entries e where e.id = entry_id and e.user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- Storage: one public bucket, writes restricted to each user's own folder.
-- Object paths are `<user_id>/<prefix>_<timestamp>_<rand>.<ext>`.
-- ═══════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

drop policy if exists "photos are publicly readable" on storage.objects;
create policy "photos are publicly readable" on storage.objects
  for select using (bucket_id = 'photos');

drop policy if exists "users upload into their own folder" on storage.objects;
create policy "users upload into their own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update their own objects" on storage.objects;
create policy "users update their own objects" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete their own objects" on storage.objects;
create policy "users delete their own objects" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
