
import { supabase, isSupabaseConfigured } from './supabaseClient';

const BUCKET = 'documents';

/** Max 20 MB */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

export const ACCEPTED_EXTENSIONS =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📑';
  if (['txt', 'csv'].includes(ext)) return '📃';
  return '📎';
}

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a file to Supabase Storage bucket "documents".
 * Returns the public URL and storage path, or null if Supabase is not configured.
 */
export async function uploadDocument(
  file: File,
  userId: string
): Promise<UploadResult | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
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
 * Delete a previously uploaded document from Supabase Storage.
 */
export async function deleteDocument(storagePath: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !storagePath) return;
  await supabase.storage.from(BUCKET).remove([storagePath]);
}
