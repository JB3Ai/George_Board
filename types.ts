export type UserEmail = string;

export enum ItemType {
  NOTE = 'NOTE',
  TASK = 'TASK',
  EVENT = 'EVENT',
  WEBPAGE = 'WEBPAGE',
  YOUTUBE = 'YOUTUBE',
  DOCUMENT = 'DOCUMENT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CHAT = 'CHAT'
}

export enum Theme {
  NEON = 'NEON',
  MIDNIGHT = 'MIDNIGHT',
  PAPER = 'PAPER',
  SAND = 'SAND',
  OCEAN = 'OCEAN',
  CARBON = 'CARBON'
}

export enum FontSize {
  SMALL = 'SMALL',
  LARGE = 'LARGE'
}

export enum TaskStatus {
  OPEN = 'OPEN',
  WAITING = 'WAITING',
  DONE = 'DONE'
}

export enum EnrichmentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  DELAYED = 'DELAYED'
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
  syncTabId?: string;
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
  isDemo?: boolean;
  sharedGroupId?: string;
  projectId?: string;
  boardId?: string;
  preview_fail_count?: number;
  preview_last_fetched_at?: number;
  preview_next_allowed_at?: number;
  // Document fields
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export interface UserSession {
  email: UserEmail;
  pinVerified: boolean;
  trustUntil?: number;
}

export interface UserProject {
  id: string;
  name: string;
  index: number;
  createdAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardMember {
  boardId: string;
  userEmail: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}
