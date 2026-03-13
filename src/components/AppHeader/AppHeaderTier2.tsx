import React from 'react';
import { type ProjectTab } from './ProjectTabs';
import { GridViewSelector, type ViewMode } from './GridViewSelector';

export interface AppHeaderTier2Props {
  isOwner: boolean;
  syncLabel: string;                        // e.g. "SYNC CHANNEL: JONO ↔ TEST"

  /* Owner-only: user name tabs */
  userTabs?: string[];
  activeUserTab?: string;
  onUserTabChange?: (user: string) => void;

  /* User-only: project tabs */
  projectTabs?: ProjectTab[];
  activeProjectTab?: string;
  onProjectTabChange?: (tab: string) => void;

  /* Both: view selector */
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/* ─── Owner Tier 2: Sync label · User names · ViewSelector ─── */

const OwnerTier2: React.FC<AppHeaderTier2Props> = ({
  syncLabel,
  userTabs = [],
  activeUserTab,
  onUserTabChange,
  viewMode,
  onViewModeChange,
}) => (
  <div className="app-header-tier2">
    <span className="tier2-sync-label">{syncLabel}</span>
    <nav className="flex items-center justify-center gap-1 overflow-x-auto tier2-scroll">
      {userTabs.map((user) => (
        <button
          key={user}
          onClick={() => onUserTabChange?.(user)}
          className={`tier2-tab ${activeUserTab === user ? 'tier2-tab--active' : ''}`}
        >
          {user}
        </button>
      ))}
    </nav>
    <GridViewSelector viewMode={viewMode} onChange={onViewModeChange} />
  </div>
);

/* ─── User Tier 2: Sync label · Project tabs (HOME→TABn→CHAT) ─── */

const UserTier2: React.FC<AppHeaderTier2Props> = ({
  syncLabel,
  projectTabs = [],
  activeProjectTab,
  onProjectTabChange,
  viewMode,
  onViewModeChange,
}) => {
  /* Enforce order: HOME → custom tabs → CHAT (no CONFIG for users) */
  const home = projectTabs.find((t) => t.id === 'HOME');
  const chat = projectTabs.find((t) => t.id === 'CHAT');
  const custom = projectTabs.filter(
    (t) => t.id !== 'HOME' && t.id !== 'CHAT' && t.id !== 'CONFIG',
  );
  const ordered = [home, ...custom, chat].filter(Boolean) as ProjectTab[];

  return (
    <div className="app-header-tier2">
      <span className="tier2-sync-label">{syncLabel}</span>
      <nav className="flex items-center justify-center gap-1">
        {ordered.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onProjectTabChange?.(tab.id)}
            className={`tier2-tab ${activeProjectTab === tab.id ? 'tier2-tab--active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <GridViewSelector viewMode={viewMode} onChange={onViewModeChange} />
    </div>
  );
};

/* ─── Dispatcher ─── */

export const AppHeaderTier2: React.FC<AppHeaderTier2Props> = (props) =>
  props.isOwner ? <OwnerTier2 {...props} /> : <UserTier2 {...props} />;
