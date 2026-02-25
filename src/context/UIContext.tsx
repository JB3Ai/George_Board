
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, FontSize } from '../../types';

interface UIContextType {
  theme: Theme;
  fontSize: FontSize;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('jb3_theme');
    return (saved as Theme) || Theme.NEON;
  });

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem('jb3_fontSize');
    return (saved as FontSize) || FontSize.SMALL;
  });

  useEffect(() => {
    localStorage.setItem('jb3_theme', theme);
    document.documentElement.setAttribute('data-theme', theme.toLowerCase());
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('jb3_fontSize', fontSize);
    document.documentElement.setAttribute('data-font-size', fontSize.toLowerCase());
  }, [fontSize]);

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
