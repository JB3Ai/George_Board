import { userRegistry } from './userRegistry';

const pinKey = (email: string) => `pin_hash_${email.trim().toLowerCase()}`;

export function isAllowlisted(email: string): boolean {
  return userRegistry.isRegistered(email);
}

export function isFirstTimeUser(email: string): boolean {
  const normalized = pinKey(email);
  const legacy = `pin_hash_${email}`;
  return !localStorage.getItem(normalized) && !localStorage.getItem(legacy);
}

export const supabaseAuth = {
  verifyPin: async (email: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const defaultPins: Record<string, string> = {
      'jono@jonoblackburn.com': '4020',
      'sue@jb3ai.com': '1234',
      'bartho@jb3ai.com': '1234',
      'george@jb3ai.com': '1234',
      'tammy@jb3ai.com': '1234',
      'candice@jb3ai.com': '1234',
      'radkin@jb3ai.com': '1234',
      'stephan@jb3ai.com': '1234',
      'mussa@jb3ai.com': '1234',
      'jason@jb3ai.com': '1234',
      'nicolette@jb3ai.com': '1234',
      'tracy@jb3ai.com': '1234'
    };

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedKey = pinKey(email);
    const legacyKey = `pin_hash_${email}`;

    const storedPin =
      localStorage.getItem(normalizedKey) ||
      localStorage.getItem(legacyKey) ||
      defaultPins[normalizedEmail] ||
      '1234';

    if (pin === storedPin) {
      return { success: true };
    }

    return { success: false, error: 'Credential validation failed' };
  },

  setPin: async (email: string, pin: string) => {
    localStorage.setItem(pinKey(email), pin);
  },

  resetPin: async (email: string) => {
    localStorage.removeItem(pinKey(email));
    localStorage.removeItem(`pin_hash_${email}`);
  }
};
