// Powered by OnSpace.AI — Supabase data access layer
//
// Every read is scoped by user or by parent id; row-level security in
// supabase/migrations/0001_init.sql enforces the same scoping server-side.
// Counters (album_count / photo_count / entry_count) and cover photos are
// maintained by database triggers, so this layer never writes them.
import { getSupabaseClient } from '@/template';
import { Group, Album, Photo, Carnet, CarnetEntry, CarnetField } from '@/types';
import { GroupRow, AlbumRow, PhotoRow, CarnetRow, CarnetEntryRow, CarnetFieldRow } from '@/types/database';
import { uploadImage, removeImages, getPublicUrl } from '@/services/upload';

const sb = () => getSupabaseClient();

export { getPublicUrl };

/** Ids minted client-side before a first save use these prefixes. */
function isDraftId(id: string | undefined, prefix: string): boolean {
  return !id || id.startsWith(`${prefix}_`);
}

// ── Groups ───────────────────────────────────────────────────────────────────
export async function getGroups(userId: string): Promise<Group[]> {
  const { data, error } = await sb()
    .from('groups')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToGroup);
}

export async function saveGroup(group: Group): Promise<Group> {
  const row = {
    user_id: group.userId,
    name: group.name,
    description: group.description ?? null,
    color: group.color,
  };

  if (isDraftId(group.id, 'group')) {
    const { data, error } = await sb().from('groups').insert(row).select().single();
    if (error) throw new Error(error.message);
    return rowToGroup(data);
  }

  const { data, error } = await sb().from('groups').update(row).eq('id', group.id).select().single();
  if (error) throw new Error(error.message);
  return rowToGroup(data);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const paths = await collectGroupStoragePaths(groupId);
  const { error } = await sb().from('groups').delete().eq('id', groupId);
  if (error) throw new Error(error.message);
  await removeImages(paths);
}

async function collectGroupStoragePaths(groupId: string): Promise<string[]> {
  const { data } = await sb().from('photos').select('storage_path').eq('group_id', groupId);
  return (data ?? []).map((r: { storage_path: string }) => r.storage_path);
}

function rowToGroup(r: GroupRow): Group {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    description: r.description ?? undefined,
    color: r.color,
    coverPhoto: r.cover_photo ? getPublicUrl(r.cover_photo) : undefined,
    albumCount: r.album_count,
    createdAt: r.created_at,
  };
}

// ── Albums ───────────────────────────────────────────────────────────────────
export async function getAlbums(groupId: string): Promise<Album[]> {
  const { data, error } = await sb()
    .from('albums')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToAlbum);
}

export async function getAllAlbums(userId: string): Promise<Album[]> {
  const { data, error } = await sb()
    .from('albums')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToAlbum);
}

export async function saveAlbum(album: Album): Promise<Album> {
  const row = {
    user_id: album.userId,
    group_id: album.groupId,
    name: album.name,
    description: album.description ?? null,
  };

  if (isDraftId(album.id, 'album')) {
    const { data, error } = await sb().from('albums').insert(row).select().single();
    if (error) throw new Error(error.message);
    return rowToAlbum(data);
  }

  const { data, error } = await sb().from('albums').update(row).eq('id', album.id).select().single();
  if (error) throw new Error(error.message);
  return rowToAlbum(data);
}

export async function deleteAlbum(albumId: string): Promise<void> {
  const { data } = await sb().from('photos').select('storage_path').eq('album_id', albumId);
  const paths = (data ?? []).map((r: { storage_path: string }) => r.storage_path);
  const { error } = await sb().from('albums').delete().eq('id', albumId);
  if (error) throw new Error(error.message);
  await removeImages(paths);
}

function rowToAlbum(r: AlbumRow): Album {
  return {
    id: r.id,
    userId: r.user_id,
    groupId: r.group_id,
    name: r.name,
    description: r.description ?? undefined,
    coverPhoto: r.cover_photo ? getPublicUrl(r.cover_photo) : undefined,
    photoCount: r.photo_count,
    createdAt: r.created_at,
  };
}

// ── Photos ───────────────────────────────────────────────────────────────────
export async function getPhotos(albumId: string): Promise<Photo[]> {
  const { data, error } = await sb()
    .from('photos')
    .select('*')
    .eq('album_id', albumId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToPhoto);
}

export async function getAllPhotos(userId: string): Promise<Photo[]> {
  const { data, error } = await sb()
    .from('photos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToPhoto);
}

export async function addPhotoToAlbum(
  userId: string,
  albumId: string,
  groupId: string,
  localUri: string,
  name: string,
): Promise<Photo> {
  const storagePath = await uploadImage(localUri, userId, 'photo');

  const { data, error } = await sb()
    .from('photos')
    .insert({
      user_id: userId,
      album_id: albumId,
      group_id: groupId,
      storage_path: storagePath,
      name,
    })
    .select()
    .single();

  if (error) {
    // Do not leave an orphaned object behind if the row insert failed.
    await removeImages([storagePath]);
    throw new Error(error.message);
  }
  return rowToPhoto(data);
}

export async function updatePhoto(photo: Photo): Promise<void> {
  const { error } = await sb()
    .from('photos')
    .update({ name: photo.name, caption: photo.caption ?? null })
    .eq('id', photo.id);
  if (error) throw new Error(error.message);
}

export async function deletePhoto(photoId: string): Promise<void> {
  const { data } = await sb().from('photos').select('storage_path').eq('id', photoId).single();
  const { error } = await sb().from('photos').delete().eq('id', photoId);
  if (error) throw new Error(error.message);
  if (data?.storage_path) await removeImages([data.storage_path]);
}

export async function movePhotoToAlbum(photoId: string, toAlbumId: string, toGroupId: string): Promise<void> {
  const { error } = await sb()
    .from('photos')
    .update({ album_id: toAlbumId, group_id: toGroupId })
    .eq('id', photoId);
  if (error) throw new Error(error.message);
}

function rowToPhoto(r: PhotoRow): Photo {
  return {
    id: r.id,
    userId: r.user_id,
    albumId: r.album_id,
    groupId: r.group_id,
    uri: getPublicUrl(r.storage_path),
    storagePath: r.storage_path,
    name: r.name,
    caption: r.caption ?? undefined,
    createdAt: r.created_at,
  };
}

// ── Carnets ──────────────────────────────────────────────────────────────────
export async function getCarnets(userId: string): Promise<Carnet[]> {
  const { data, error } = await sb()
    .from('carnets')
    .select('*, carnet_fields(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToCarnet);
}

export async function saveCarnet(carnet: Carnet): Promise<Carnet> {
  const row = {
    user_id: carnet.userId,
    name: carnet.name,
    description: carnet.description ?? null,
    emoji: carnet.emoji,
  };

  if (isDraftId(carnet.id, 'carnet')) {
    const { data, error } = await sb().from('carnets').insert(row).select().single();
    if (error) throw new Error(error.message);
    const created = data as CarnetRow;
    const fields = await insertCarnetFields(created.id, carnet.fields);
    return { ...rowToCarnet(created), fields };
  }

  const { data, error } = await sb()
    .from('carnets')
    .update(row)
    .eq('id', carnet.id)
    .select('*, carnet_fields(*)')
    .single();
  if (error) throw new Error(error.message);
  return rowToCarnet(data);
}

async function insertCarnetFields(carnetId: string, fields: CarnetField[]): Promise<CarnetField[]> {
  if (fields.length === 0) return [];
  const rows = fields.map((f, position) => ({
    carnet_id: carnetId,
    label: f.label,
    type: f.type,
    position,
  }));
  const { data, error } = await sb().from('carnet_fields').insert(rows).select();
  if (error) throw new Error(error.message);
  return (data ?? []).map(fieldRowToField);
}

export async function deleteCarnet(carnetId: string): Promise<void> {
  const { data } = await sb().from('carnet_entries').select('storage_path').eq('carnet_id', carnetId);
  const paths = (data ?? []).map((r: { storage_path: string }) => r.storage_path);
  const { error } = await sb().from('carnets').delete().eq('id', carnetId);
  if (error) throw new Error(error.message);
  await removeImages(paths);
}

function fieldRowToField(f: CarnetFieldRow): CarnetField {
  return { id: f.id, label: f.label, type: f.type };
}

function rowToCarnet(r: CarnetRow): Carnet {
  const fields = [...(r.carnet_fields ?? [])].sort((a, b) => a.position - b.position).map(fieldRowToField);
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    description: r.description ?? undefined,
    emoji: r.emoji,
    fields,
    entryCount: r.entry_count,
    coverPhoto: r.cover_photo ? getPublicUrl(r.cover_photo) : undefined,
    createdAt: r.created_at,
  };
}

// ── Carnet entries ───────────────────────────────────────────────────────────
export async function getCarnetEntries(carnetId: string): Promise<CarnetEntry[]> {
  const { data, error } = await sb()
    .from('carnet_entries')
    .select('*, carnet_entry_values(*)')
    .eq('carnet_id', carnetId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToEntry);
}

export async function saveCarnetEntry(entry: CarnetEntry): Promise<CarnetEntry> {
  if (isDraftId(entry.id, 'entry')) {
    const storagePath = await uploadImage(entry.uri, entry.userId, 'carnet');
    const { data, error } = await sb()
      .from('carnet_entries')
      .insert({
        carnet_id: entry.carnetId,
        user_id: entry.userId,
        name: entry.name,
        description: entry.description,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (error) {
      await removeImages([storagePath]);
      throw new Error(error.message);
    }

    await upsertEntryValues(data.id, entry.fieldValues);
    return { ...entry, id: data.id, storagePath, uri: getPublicUrl(storagePath) };
  }

  const { error } = await sb()
    .from('carnet_entries')
    .update({ name: entry.name, description: entry.description })
    .eq('id', entry.id);
  if (error) throw new Error(error.message);

  await upsertEntryValues(entry.id, entry.fieldValues);
  return entry;
}

async function upsertEntryValues(
  entryId: string,
  fieldValues: { fieldId: string; value: string }[],
): Promise<void> {
  if (fieldValues.length === 0) return;
  const rows = fieldValues.map((fv) => ({
    entry_id: entryId,
    field_id: fv.fieldId,
    value: fv.value,
  }));
  const { error } = await sb().from('carnet_entry_values').upsert(rows, { onConflict: 'entry_id,field_id' });
  if (error) throw new Error(error.message);
}

export async function deleteCarnetEntry(entryId: string): Promise<void> {
  const { data } = await sb().from('carnet_entries').select('storage_path').eq('id', entryId).single();
  const { error } = await sb().from('carnet_entries').delete().eq('id', entryId);
  if (error) throw new Error(error.message);
  if (data?.storage_path) await removeImages([data.storage_path]);
}

function rowToEntry(r: CarnetEntryRow): CarnetEntry {
  return {
    id: r.id,
    carnetId: r.carnet_id,
    userId: r.user_id,
    uri: getPublicUrl(r.storage_path),
    storagePath: r.storage_path,
    name: r.name,
    description: r.description ?? '',
    fieldValues: (r.carnet_entry_values ?? []).map((v) => ({ fieldId: v.field_id, value: v.value })),
    createdAt: r.created_at,
  };
}
