import { userRegistry } from './userRegistry';

export function isAllowlisted(email: string): boolean {
  return userRegistry.isRegistered(email);
}

export function isFirstTimeUser(email: string): boolean {
  return !localStorage.getItem(`pin_hash_${email.toLowerCase()}`);
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

    const storedPin = localStorage.getItem(`pin_hash_${email}`) || defaultPins[email.toLowerCase()] || '1234';

    if (pin === storedPin) {
      return { success: true };
    }

    return { success: false, error: 'Credential validation failed' };
  },

  setPin: async (email: string, pin: string) => {
    localStorage.setItem(`pin_hash_${email}`, pin);
  },

  resetPin: async (email: string) => {
    localStorage.removeItem(`pin_hash_${email}`);
  }
};
