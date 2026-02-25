
export type UserEmail = 'jono@jonoblackburn.com' | 'gsourlis@yahoo.com';

export enum ItemType {
  NOTE = 'NOTE',
  TASK = 'TASK',
  EVENT = 'EVENT',
  WEBPAGE = 'WEBPAGE',
  YOUTUBE = 'YOUTUBE'
}

export enum TaskStatus {
  OPEN = 'OPEN',
  WAITING = 'WAITING',
  DONE = 'DONE'
}

export enum EnrichmentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export interface LinkMetadata {
  title?: string;
  description?: string;
  siteName?: string;
  favicon?: string;
  og_image_url?: string;
  og_image_width?: number;
  og_image_height?: number;
}

export interface ClipboardItem {
  id: string;
  userId: UserEmail;
  type: ItemType;
  title: string;
  content: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: number;
  taskStatus?: TaskStatus;
  dueDate?: string;
  eventLocation?: string;
  metadata?: LinkMetadata;
  enrichmentStatus?: EnrichmentStatus;
  readBy?: UserEmail[];
}

export interface UserSession {
  email: UserEmail;
  pinVerified: boolean;
  trustUntil?: number;
}
