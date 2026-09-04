// Powered by OnSpace.AI — Cross-platform binary upload to Supabase Storage
//
// Native (iOS/Android) exposes local files as `file://` URIs that `fetch` cannot
// stream reliably, so we read them through expo-file-system. Web and the Electron
// desktop shell hand us `blob:`/`data:`/`http(s):` URIs, where `fetch` is both
// correct and far cheaper than a base64 round-trip.
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { getSupabaseClient } from '@/template';

export const PHOTOS_BUCKET = 'photos';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

function extensionOf(uri: string): string {
  const cleaned = uri.split('?')[0].split('#')[0];
  const ext = cleaned.split('.').pop()?.toLowerCase() ?? '';
  return ext && ext.length <= 5 && MIME_BY_EXT[ext] ? ext : 'jpg';
}

function contentTypeOf(ext: string): string {
  return MIME_BY_EXT[ext] ?? 'image/jpeg';
}

/**
 * Uploads a local image to the `photos` bucket and returns its storage path.
 * The path is namespaced per user so storage RLS can scope access by folder.
 */
export async function uploadImage(uri: string, userId: string, prefix: string): Promise<string> {
  const ext = extensionOf(uri);
  const path = `${userId}/${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const contentType = contentTypeOf(ext);

  const body = Platform.OS === 'web' ? await readAsBlob(uri) : await readAsArrayBuffer(uri);

  const { error } = await getSupabaseClient()
    .storage.from(PHOTOS_BUCKET)
    .upload(path, body, { contentType, upsert: false });

  if (error) throw new Error(`Échec de l'envoi de l'image : ${error.message}`);
  return path;
}

async function readAsBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Impossible de lire l'image (HTTP ${response.status})`);
  return response.blob();
}

async function readAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return decode(base64);
}

/** Removes objects from the photos bucket, ignoring paths that no longer exist. */
export async function removeImages(paths: string[]): Promise<void> {
  const valid = paths.filter(Boolean);
  if (valid.length === 0) return;
  const { error } = await getSupabaseClient().storage.from(PHOTOS_BUCKET).remove(valid);
  if (error) console.warn('[Storage] Suppression du fichier échouée:', error.message);
}

/** Resolves a storage path to a public URL (pass-through for absolute URLs). */
export function getPublicUrl(storagePath: string | null | undefined): string {
  if (!storagePath) return '';
  if (storagePath.startsWith('http')) return storagePath;
  const { data } = getSupabaseClient().storage.from(PHOTOS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
