import React from 'react';
import { Home, Info, Settings, Sun, LogOut } from 'lucide-react';
import { AppHeaderTier2, type AppHeaderTier2Props } from './AppHeaderTier2';
import { GridViewSelector, type ViewMode } from './GridViewSelector';
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

/* ─── Left zone: Home · OS³ · Info ─── */

const HeaderLeft: React.FC<Pick<AppHeaderProps, 'onHomeClick' | 'onInfoClick'>> = ({
  onHomeClick,
  onInfoClick,
}) => (
  <div className="flex items-center gap-2">
    <button onClick={onHomeClick} className="header-btn" title="Home">
      <Home size={16} />
    </button>
    <span className="text-[11px] font-bold tracking-[0.3em] text-white/80 uppercase select-none px-1">
      OS³
    </span>
    <button onClick={onInfoClick} className="header-btn" title="Info">
      <Info size={16} />
    </button>
  </div>
);

/* ─── Center zone: Environment · Role status capsule ─── */

const HeaderCenter: React.FC<Pick<AppHeaderProps, 'username' | 'environment'>> = ({
  username,
  environment = 'LIVE',
}) => (
  <div className="flex items-center justify-center">
    <div className="header-status-capsule">
      <span className="header-status-label">
        {environment === 'DEMO' ? 'TEST' : environment}
      </span>
      <span className="header-status-dot">·</span>
      <span className="header-status-label">{username}</span>
    </div>
  </div>
);

/* ─── Right zone: ViewSelector · Gear · Theme · Exit ─── */

interface HeaderRightProps {
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onSystemGearClick?: () => void;
  onThemeToggle?: () => void;
  onExitClick?: () => void;
}

const HeaderRight: React.FC<HeaderRightProps> = ({
  viewMode,
  onViewModeChange,
  onSystemGearClick,
  onThemeToggle,
  onExitClick,
}) => (
  <div className="flex items-center gap-2">
    {viewMode && onViewModeChange && (
      <>
        <GridViewSelector viewMode={viewMode} onChange={onViewModeChange} />
        <div className="w-px h-5 bg-white/10" />
      </>
    )}
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
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
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
