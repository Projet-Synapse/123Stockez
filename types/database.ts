// Powered by OnSpace.AI — Row shapes returned by Supabase (snake_case)
// Keep in sync with supabase/migrations/*.sql

export interface GroupRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  cover_photo: string | null;
  album_count: number;
  created_at: string;
}

export interface AlbumRow {
  id: string;
  user_id: string;
  group_id: string;
  name: string;
  description: string | null;
  cover_photo: string | null;
  photo_count: number;
  created_at: string;
}

export interface PhotoRow {
  id: string;
  user_id: string;
  album_id: string;
  group_id: string;
  storage_path: string;
  name: string;
  caption: string | null;
  created_at: string;
}

export interface CarnetFieldRow {
  id: string;
  carnet_id: string;
  label: string;
  type: 'text' | 'number';
  position: number;
}

export interface CarnetRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  emoji: string;
  entry_count: number;
  cover_photo: string | null;
  created_at: string;
  carnet_fields?: CarnetFieldRow[];
}

export interface CarnetEntryValueRow {
  entry_id: string;
  field_id: string;
  value: string;
}

export interface CarnetEntryRow {
  id: string;
  carnet_id: string;
  user_id: string;
  storage_path: string;
  name: string;
  description: string | null;
  created_at: string;
  carnet_entry_values?: CarnetEntryValueRow[];
}

/** Release manifest rows powering the in-app update tracker. */
export interface AppVersionRow {
  id: string;
  version: string;
  platform: 'ios' | 'android' | 'web' | 'windows' | 'macos' | 'linux';
  channel: 'stable' | 'beta';
  mandatory: boolean;
  release_notes: string | null;
  download_url: string | null;
  published_at: string;
}
