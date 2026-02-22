-- Sparkery cleaning inspection image storage
-- Run in Supabase SQL Editor

insert into storage.buckets (id, name, public)
values ('inspection-assets', 'inspection-assets', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

-- Do not alter storage.objects ownership/RLS here.
-- Supabase manages this table internally.

drop policy if exists inspection_assets_public_read on storage.objects;
create policy inspection_assets_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'inspection-assets');

drop policy if exists inspection_assets_public_insert on storage.objects;
create policy inspection_assets_public_insert
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'inspection-assets');

drop policy if exists inspection_assets_public_update on storage.objects;
create policy inspection_assets_public_update
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'inspection-assets')
with check (bucket_id = 'inspection-assets');

drop policy if exists inspection_assets_public_delete on storage.objects;
create policy inspection_assets_public_delete
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'inspection-assets');
