
import { supabase, isSupabaseConfigured } from './supabaseClient';

const BUCKET = 'media';

/** Max 50 MB (images + video) */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const ACCEPTED_IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.svg';
export const ACCEPTED_VIDEO_EXTENSIONS = '.mp4,.mov,.webm,.avi,.mkv';
export const ACCEPTED_MEDIA_EXTENSIONS = `${ACCEPTED_IMAGE_EXTENSIONS},${ACCEPTED_VIDEO_EXTENSIONS}`;

export interface MediaUploadResult {
  url: string;
  path: string;
}

export function isImageFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
}

export function isVideoFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext);
}

/**
 * Upload an image or video file to Supabase Storage bucket "media".
 * Returns the public URL and storage path, or null if Supabase is not configured.
 */
export async function uploadMedia(
  file: File,
  userId: string
): Promise<MediaUploadResult | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 50 MB.');
  }

  const safeUserId = userId.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${safeUserId}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, cacheControl: '3600' });

  if (error || !data) {
    throw new Error(error?.message ?? 'Upload failed');
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  return { url: publicData.publicUrl, path: data.path };
}

/**
 * Delete a previously uploaded media file from Supabase Storage.
 */
export async function deleteMedia(storagePath: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !storagePath) return;
  await supabase.storage.from(BUCKET).remove([storagePath]);
}
