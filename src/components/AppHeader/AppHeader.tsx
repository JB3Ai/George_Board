import React from 'react';
import { Home, Info, Settings, Sun, LogOut, Rocket } from 'lucide-react';
import { AppHeaderTier2, type AppHeaderTier2Props } from './AppHeaderTier2';
import { OwnerAdminConsole, type OwnerAdminConsoleProps } from './OwnerAdminConsole';
import './AppHeader.css';

/* ─── Props ─── */

export interface AppHeaderProps extends Partial<AppHeaderTier2Props>, Partial<OwnerAdminConsoleProps> {
  username: string;
  environment?: 'DEMO' | 'LIVE';
  isOwner: boolean;
  onHomeClick?: () => void;
  onInfoClick?: () => void;
  onDemoClick?: () => void;
  onSystemGearClick?: () => void;
  onThemeToggle?: () => void;
  onExitClick?: () => void;
}

/* ─── Tier 1 Left: Logo · Home · Info ─── */

const HeaderLeft: React.FC<Pick<AppHeaderProps, 'onHomeClick' | 'onInfoClick'>> = ({
  onHomeClick,
  onInfoClick,
}) => (
  <div className="flex items-center gap-2">
    <span className="text-[11px] font-bold tracking-[0.3em] text-white/80 uppercase select-none px-1">
      OS³
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

/* ─── Tier 1 Center: DEMO(button) · Username ─── */

const HeaderCenter: React.FC<Pick<AppHeaderProps, 'username' | 'environment' | 'onDemoClick'>> = ({
  username,
  environment = 'LIVE',
  onDemoClick,
}) => (
  <div className="flex items-center justify-center">
    <div className="header-status-capsule">
      <button
        onClick={onDemoClick}
        className="header-demo-btn"
        title="Open Demo"
      >
        <Rocket size={12} className="mr-1 opacity-70" />
        DEMO
      </button>
      <span className="header-status-dot">·</span>
      <span className="header-status-label">{username}</span>
    </div>
  </div>
);

/* ─── Tier 1 Right: System Gear · Theme · Exit ─── */

const HeaderRight: React.FC<Pick<AppHeaderProps, 'onSystemGearClick' | 'onThemeToggle' | 'onExitClick'>> = ({
  onSystemGearClick,
  onThemeToggle,
  onExitClick,
}) => (
  <div className="flex items-center gap-2">
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

/* ─── AppHeader Orchestrator ─── */

export const AppHeader: React.FC<AppHeaderProps> = (props) => {
  const {
    isOwner,
    /* Tier 2 */
    syncLabel, userTabs, activeUserTab, onUserTabChange,
    projectTabs, activeProjectTab, onProjectTabChange,
    viewMode, onViewModeChange,
    /* Owner Admin Console */
    selectedUser, userStatus, lastSeen,
    adminProjectTabs, activeAdminTab, onAdminTabChange,
    onRenameTab, onDeleteTab, onAddTab,
    ...tier1Props
  } = props;

  const hasTier2 = syncLabel && viewMode && onViewModeChange;

  const hasAdminConsole =
    isOwner && selectedUser && adminProjectTabs && onAdminTabChange;

  return (
    <header className="app-header-wrapper">
      {/* ── Tier 1 ── */}
      <div className="app-header-tier1">
        <HeaderLeft onHomeClick={tier1Props.onHomeClick} onInfoClick={tier1Props.onInfoClick} />
        <HeaderCenter username={tier1Props.username} environment={tier1Props.environment} onDemoClick={tier1Props.onDemoClick} />
        <HeaderRight
          onSystemGearClick={tier1Props.onSystemGearClick}
          onThemeToggle={tier1Props.onThemeToggle}
          onExitClick={tier1Props.onExitClick}
        />
      </div>

      {/* ── Tier 2 ── */}
      {hasTier2 && (
        <AppHeaderTier2
          isOwner={isOwner}
          syncLabel={syncLabel}
          userTabs={userTabs}
          activeUserTab={activeUserTab}
          onUserTabChange={onUserTabChange}
          projectTabs={projectTabs}
          activeProjectTab={activeProjectTab}
          onProjectTabChange={onProjectTabChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      )}

      {/* ── Owner Admin Console ── */}
      {hasAdminConsole && (
        <OwnerAdminConsole
          selectedUser={selectedUser}
          userStatus={userStatus}
          lastSeen={lastSeen}
          adminProjectTabs={adminProjectTabs}
          activeAdminTab={activeAdminTab!}
          onAdminTabChange={onAdminTabChange}
          onRenameTab={onRenameTab}
          onDeleteTab={onDeleteTab}
          onAddTab={onAddTab}
        />
      )}
    </header>
  );
};
