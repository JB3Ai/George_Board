
import { UserEmail } from './types';

export interface UserTab {
  id: string;
  label: string;
  email: UserEmail;
  isOwner?: boolean;
}

export const USER_TABS: UserTab[] = [
  { id: 'JONO', label: 'JONO', email: 'jono@jonoblackburn.com', isOwner: true },
  { id: 'SUE', label: 'SUE', email: 'sue@jb3ai.com' },
  { id: 'BARTHO', label: 'BARTHO', email: 'bartho@jb3ai.com' },
  { id: 'GEORGE', label: 'GEORGE', email: 'george@jb3ai.com' },
  { id: 'TAMMY', label: 'TAMMY', email: 'tammy@jb3ai.com' },
  { id: 'CANDICE', label: 'CANDICE', email: 'candice@jb3ai.com' },
  { id: 'RADKIN', label: 'RADKIN', email: 'radkin@jb3ai.com' },
  { id: 'STEPHAN', label: 'STEPHAN', email: 'stephan@jb3ai.com' },
  { id: 'MUSSA', label: 'MUSSA', email: 'mussa@jb3ai.com' },
  { id: 'JASON', label: 'JASON', email: 'jason@jb3ai.com' },
  { id: 'NICOLETTE', label: 'NICOLETTE', email: 'nicolette@jb3ai.com' },
  { id: 'TRACY', label: 'TRACY', email: 'tracy@jb3ai.com' }
];

export const ALLOWLIST: UserEmail[] = USER_TABS.map((user) => user.email);
export const OWNER_EMAIL: UserEmail = 'jono@jonoblackburn.com';
export const TABS = USER_TABS;
