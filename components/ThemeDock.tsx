import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Theme } from '../types';
import { useUI } from '../src/context/UIContext';

interface ThemeMeta {
  label: string;
  bg: string;
  accent: string;
}

const THEME_META: Record<Theme, ThemeMeta> = {
  [Theme.NEON]:     { label: 'NEON',     bg: 'Media/NEON.jpg',       accent: '#66FF66' },
  [Theme.MIDNIGHT]: { label: 'MIDNIGHT', bg: 'Media/MIDNIGHT.jpg',   accent: '#F27D26' },
  [Theme.PAPER]:    { label: 'PAPER',    bg: 'Media/PAPER.jpg',      accent: '#141414' },
  [Theme.SAND]:     { label: 'SAND',     bg: 'Media/SAND.jpg',       accent: '#C8961E' },
  [Theme.OCEAN]:    { label: 'OCEAN',    bg: 'Media/OCEAN.jpg',      accent: '#48D1CC' },
  [Theme.CARBON]:   { label: 'CARBON',   bg: 'Media/background.jpg', accent: '#4DB8FF' },
};

const THEME_ORDER: Theme[] = [
  Theme.NEON,
  Theme.MIDNIGHT,
  Theme.PAPER,
  Theme.SAND,
  Theme.OCEAN,
  Theme.CARBON,
];

export const ThemeDock: React.FC = () => {
  const { theme, setTheme } = useUI();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionVisible, setTransitionVisible] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<Theme | null>(null);
  const [dockReady, setDockReady] = useState(false);
  const baseUrl = import.meta.env.BASE_URL;

  useEffect(() => {
    const t = setTimeout(() => setDockReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  const handleSwatchClick = useCallback((t: Theme) => {
    if (isTransitioning || t === theme) return;
    setPendingTheme(t);
    setIsTransitioning(true);
    setTransitionVisible(true);

    // After 1.5s hub exposure, apply theme and fade out
    setTimeout(() => {
      setTheme(t);
      setTransitionVisible(false);
      setTimeout(() => {
        setIsTransitioning(false);
        setPendingTheme(null);
      }, 500); // wait for fade-out
    }, 1200);
  }, [isTransitioning, theme, setTheme]);

  const handleSwatchMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const { left, top } = el.getBoundingClientRect();
    el.style.setProperty('--swatch-x', `${e.clientX - left}px`);
    el.style.setProperty('--swatch-y', `${e.clientY - top}px`);
  };

  return (
    <>
      {/* Transition Hub overlay — shown during theme change */}
      <div
        className="fixed inset-0 z-[200] pointer-events-none transition-opacity duration-500"
        style={{
          opacity: transitionVisible ? 1 : 0,
          backgroundImage: `url('${baseUrl}Media/Transition_Hub.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Material Dock */}
      <div
        className={`os3-material-dock${dockReady ? ' dock-ready' : ''}`}
        style={{ pointerEvents: isTransitioning ? 'none' : 'auto', opacity: isTransitioning ? 0.5 : 1 }}
      >
        {THEME_ORDER.map((t) => {
          const meta = THEME_META[t];
          const isActive = theme === t;
          return (
            <div
              key={t}
              className={`theme-swatch${isActive ? ' active' : ''}`}
              style={{
                backgroundImage: `url('${baseUrl}${meta.bg}')`,
                '--swatch-accent': meta.accent,
              } as React.CSSProperties}
              onMouseMove={handleSwatchMouseMove}
              onClick={() => handleSwatchClick(t)}
              title={meta.label}
            >
              {/* Fluid glow layer */}
              <div className="theme-swatch-glow" />
              {/* Label — floats above on hover */}
              <span className="theme-swatch-label">{meta.label}</span>
              {/* Active indicator dot */}
              {isActive && <span className="theme-swatch-dot" />}
            </div>
          );
        })}
      </div>
    </>
  );
};
