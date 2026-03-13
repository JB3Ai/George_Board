import React from 'react';
import { Home, Info, Settings, Sun, LogOut } from 'lucide-react';
import { AppHeaderTier2, type AppHeaderTier2Props } from './AppHeaderTier2';
import './AppHeader.css';

/* ─── Props ─── */

export interface AppHeaderProps extends Partial<AppHeaderTier2Props> {
  username: string;
  environment?: 'DEMO' | 'LIVE';
  onHomeClick?: () => void;
  onInfoClick?: () => void;
  onSystemGearClick?: () => void;
  onThemeToggle?: () => void;
  onExitClick?: () => void;
}

/* ─── Left zone: Logo · Home · Info ─── */

const HeaderLeft: React.FC<Pick<AppHeaderProps, 'onHomeClick' | 'onInfoClick'>> = ({
  onHomeClick,
  onInfoClick,
}) => (
  <div className="flex items-center gap-3">
    <span className="text-[13px] font-bold tracking-[0.25em] text-white/90 uppercase select-none">
      GB
    </span>
    <div className="w-px h-5 bg-white/10" />
    <button onClick={onHomeClick} className="header-btn" title="Home">
      <Home size={16} />
    </button>
    <button onClick={onInfoClick} className="header-btn" title="Info">
      <Info size={16} />
    </button>
  </div>
);

/* ─── Center zone: Environment · Username ─── */

const HeaderCenter: React.FC<Pick<AppHeaderProps, 'username' | 'environment'>> = ({
  username,
  environment = 'LIVE',
}) => (
  <div className="flex items-center justify-center gap-2">
    {environment === 'DEMO' && (
      <span className="text-[10px] font-bold tracking-[0.3em] text-amber-400/80 uppercase">
        DEMO
      </span>
    )}
    {environment === 'DEMO' && (
      <span className="text-white/20 text-xs select-none">·</span>
    )}
    <span className="text-[11px] font-semibold tracking-[0.2em] text-white/70 uppercase">
      {username}
    </span>
  </div>
);

/* ─── Right zone: Gear · Theme · Exit ─── */

const HeaderRight: React.FC<
  Pick<AppHeaderProps, 'onSystemGearClick' | 'onThemeToggle' | 'onExitClick'>
> = ({ onSystemGearClick, onThemeToggle, onExitClick }) => (
  <div className="flex items-center gap-3">
    <button onClick={onSystemGearClick} className="header-btn" title="System Settings">
      <Settings size={16} />
    </button>
    <button onClick={onThemeToggle} className="header-btn" title="Toggle Theme">
      <Sun size={16} />
    </button>
    <div className="w-px h-5 bg-white/10" />
    <button onClick={onExitClick} className="header-btn" title="Exit">
      <LogOut size={16} />
    </button>
  </div>
);

/* ─── AppHeader (Tier 1 + Tier 2) ─── */

export const AppHeader: React.FC<AppHeaderProps> = (props) => {
  const {
    channelTabs, activeChannel, onChannelChange,
    projectTabs, activeProjectTab, onProjectTabChange,
    viewMode, onViewModeChange,
    ...tier1Props
  } = props;

  const hasTier2 =
    channelTabs && activeChannel && onChannelChange &&
    projectTabs && activeProjectTab && onProjectTabChange &&
    viewMode && onViewModeChange;

  return (
    <header className="app-header-wrapper">
      <div className="app-header-tier1">
        <HeaderLeft onHomeClick={tier1Props.onHomeClick} onInfoClick={tier1Props.onInfoClick} />
        <HeaderCenter username={tier1Props.username} environment={tier1Props.environment} />
        <HeaderRight
          onSystemGearClick={tier1Props.onSystemGearClick}
          onThemeToggle={tier1Props.onThemeToggle}
          onExitClick={tier1Props.onExitClick}
        />
      </div>
      {hasTier2 && (
        <AppHeaderTier2
          channelTabs={channelTabs}
          activeChannel={activeChannel}
          projectTabs={projectTabs}
          activeProjectTab={activeProjectTab}
          viewMode={viewMode}
          onChannelChange={onChannelChange}
          onProjectTabChange={onProjectTabChange}
          onViewModeChange={onViewModeChange}
        />
      )}
    </header>
  );
};
