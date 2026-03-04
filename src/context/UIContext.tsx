
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, FontSize } from '../../types';
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';

interface UIContextType {
  theme: Theme;
  fontSize: FontSize;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

function getSessionEmail(): string | null {
  try {
    const saved = localStorage.getItem('jb3_session');
    if (!saved) return null;
    return JSON.parse(saved)?.email?.trim().toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t.toLowerCase());
}

function applyFontSize(s: FontSize) {
  document.documentElement.setAttribute('data-font-size', s.toLowerCase());
}

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('jb3_theme');
    return (saved as Theme) || Theme.NEON;
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem('jb3_fontSize');
    return (saved as FontSize) || FontSize.SMALL;
  });

  // Apply on first render from localStorage cache
  useEffect(() => { applyTheme(theme); }, []);
  useEffect(() => { applyFontSize(fontSize); }, []);

  // Hydrate from Supabase on mount — overrides localStorage with server values
  useEffect(() => {
    const email = getSessionEmail();
    if (!email || !isSupabaseConfigured || !supabase) return;

    (supabase as any)
      .from('user_profiles')
      .select('theme, font_size')
      .eq('email', email)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.theme && Object.values(Theme).includes(data.theme as Theme)) {
          setThemeState(data.theme as Theme);
          localStorage.setItem('jb3_theme', data.theme);
          applyTheme(data.theme as Theme);
        }
        if (data?.font_size && Object.values(FontSize).includes(data.font_size as FontSize)) {
          setFontSizeState(data.font_size as FontSize);
          localStorage.setItem('jb3_fontSize', data.font_size);
          applyFontSize(data.font_size as FontSize);
        }
      })
      .catch(() => undefined);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('jb3_theme', t);
    applyTheme(t);
    const email = getSessionEmail();
    if (email && isSupabaseConfigured && supabase) {
      (supabase as any)
        .from('user_profiles')
        .upsert({ email, theme: t, updated_at: new Date().toISOString() }, { onConflict: 'email' })
        .then(({ error }: { error: any }) => { if (error) console.warn('Theme save failed:', error.message); });
    }
  };

  const setFontSize = (s: FontSize) => {
    setFontSizeState(s);
    localStorage.setItem('jb3_fontSize', s);
    applyFontSize(s);
    const email = getSessionEmail();
    if (email && isSupabaseConfigured && supabase) {
      (supabase as any)
        .from('user_profiles')
        .upsert({ email, font_size: s, updated_at: new Date().toISOString() }, { onConflict: 'email' })
        .then(({ error }: { error: any }) => { if (error) console.warn('FontSize save failed:', error.message); });
    }
  };

  return (
    <UIContext.Provider value={{ theme, fontSize, setTheme, setFontSize }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within a UIProvider');
  return context;
};
