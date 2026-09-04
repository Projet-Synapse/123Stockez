-- Powered by OnSpace.AI — Release manifest backing the in-app update tracker.
-- Binaries live on GitHub Releases; this table is the source of truth the app
-- polls to decide whether a newer build exists for the running platform.

create table if not exists public.app_versions (
  id            uuid primary key default gen_random_uuid(),
  version       text not null,                       -- semver, e.g. '1.2.0'
  platform      text not null check (platform in ('ios','android','web','windows','macos','linux')),
  channel       text not null default 'stable' check (channel in ('stable','beta')),
  mandatory     boolean not null default false,      -- blocks use until updated
  release_notes text,
  download_url  text,                                -- store page or GitHub asset
  published_at  timestamptz not null default now(),
  unique (version, platform, channel)
);

create index if not exists app_versions_lookup_idx
  on public.app_versions (platform, channel, published_at desc);

alter table public.app_versions enable row level security;

-- The manifest is not secret: any signed-in client may read it, but only the
-- service role (CI publishing a release) may write to it.
drop policy if exists "release manifest is readable" on public.app_versions;
create policy "release manifest is readable" on public.app_versions
  for select using (true);

-- Returns the newest published release for a platform/channel, or no rows.
create or replace function public.latest_app_version(
  target_platform text,
  target_channel  text default 'stable'
)
returns setof public.app_versions
language sql
stable
as $$
  select *
    from public.app_versions
   where platform = target_platform
     and channel  = target_channel
   order by published_at desc
   limit 1;
$$;
