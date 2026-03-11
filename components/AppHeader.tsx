import React from 'react';
import { LogOut, Info, Home, Settings, Palette, Menu, X, LayoutList, Grid3X3, LayoutGrid, Shield, Rocket } from 'lucide-react';
import type { UserProject } from '../types';
import type { UserTab } from '../services/userRegistry';

const DEMO_TAB_ID = '__DEMO__';
const SETTINGS_TAB_ID = '__SETTINGS__';

const getChatAnchorId = (userId: string) => `${userId}_CHAT`;
const isChatAnchor = (id: string | null) => typeof id === 'string' && id.endsWith('_CHAT');

/** Display label: HOME for slot 1, custom label or fallback TAB{n} for slot 2+ */
const getTabLabel = (project: UserProject): string => {
  if (project.index === 1) return 'HOME';
  const custom = project.name;
  if (!custom || custom.startsWith('Project ')) return `TAB${project.index}`;
  return custom;
};

export interface AppHeaderProps {
  /* identity */
  isOwnerSession: boolean;
  signedInName: string;
  signedInRole: string;
  currentUserTab: UserTab | undefined;

  /* tab / project state */
  activeTab: string;
  setActiveTab: (id: string) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  myProjects: UserProject[];
  visibleTabs: UserTab[];

  /* view mode */
  viewMode: 'grid-big' | 'grid-small' | 'list';
  setViewMode: (mode: 'grid-big' | 'grid-small' | 'list') => void;

  /* context line */
  sectionTitle: string;

  /* ui toggles */
  showThemeDock: boolean;
  setShowThemeDock: React.Dispatch<React.SetStateAction<boolean>>;
  showMobileMenu: boolean;
  setShowMobileMenu: React.Dispatch<React.SetStateAction<boolean>>;

  /* actions */
  onOpenAES: () => void;
  onOpenInfo: () => void;
  onOpenAdminSearch: () => void;
  onLogout: () => void;

  /* form resets */
  setIsAdding: (v: boolean) => void;
  setSearchTerm: (v: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isOwnerSession,
  signedInName,
  signedInRole,
  currentUserTab,
  activeTab,
  setActiveTab,
  activeProjectId,
  setActiveProjectId,
  myProjects,
  visibleTabs,
  viewMode,
  setViewMode,
  sectionTitle,
  showThemeDock,
  setShowThemeDock,
  showMobileMenu,
  setShowMobileMenu,
  onOpenAES,
  onOpenInfo,
  onOpenAdminSearch,
  onLogout,
  setIsAdding,
  setSearchTerm,
}) => {
  const resetFormState = () => { setIsAdding(false); setSearchTerm(''); };

  const isContentView = activeTab !== DEMO_TAB_ID && activeTab !== SETTINGS_TAB_ID;
  const showViewControls = isContentView && !isChatAnchor(activeProjectId);

  return (
    <>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         TIER 1 — System Header
         Desktop: full controls · Mobile: identity + mode only
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav className="header-system">
        {/* Left: OS³ Security Badge */}
        <div className="header-system-left">
          <button onClick={onOpenAES} className="header-badge-btn" title="AES-256 Encryption">
            <Shield size={14} />
            <span className="header-badge-label">OS³</span>
          </button>
          {/* Desktop-only: Info button */}
          <button onClick={onOpenInfo} title="Info & Help" className="header-icon-btn header-desktop-only">
            <Info size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Center: Mobile-only identity chip */}
        <div className="header-mobile-identity">
          <span className="header-mobile-name">{signedInName}</span>
          <span className="header-mobile-role">{signedInRole}</span>
        </div>

        {/* Right: System controls */}
        <div className="header-system-right">
          {/* Desktop-only controls */}
          <button
            onClick={() => { setActiveTab(DEMO_TAB_ID); resetFormState(); setShowMobileMenu(false); }}
            className={`header-demo-chip header-desktop-only ${activeTab === DEMO_TAB_ID ? 'active' : ''}`}
          >
            <span className="header-demo-dot" />
            DEMO
          </button>
          <span className="header-session-badge header-desktop-only">
            {signedInName} · {signedInRole}
          </span>

          {/* Home — always visible */}
          <button
            onClick={() => {
              const homeTab = isOwnerSession ? 'JONO' : currentUserTab?.id;
              if (homeTab) { setActiveTab(homeTab); setActiveProjectId(null); }
              resetFormState(); setShowMobileMenu(false);
            }}
            title="Home"
            className={`header-icon-btn ${
              (activeTab === 'JONO' || activeTab === currentUserTab?.id) && isContentView ? 'active' : ''
            }`}
          >
            <Home size={16} strokeWidth={1.5} />
          </button>

          {/* Desktop-only: Settings, Palette, Logout */}
          <button
            onClick={() => { setActiveTab(SETTINGS_TAB_ID); resetFormState(); setShowMobileMenu(false); }}
            title="Settings"
            className={`header-icon-btn header-desktop-only ${activeTab === SETTINGS_TAB_ID ? 'active' : ''}`}
          >
            <Settings size={16} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setShowThemeDock(prev => !prev)}
            title={showThemeDock ? 'Hide Theme Selector' : 'Show Theme Selector'}
            className={`header-icon-btn header-desktop-only ${showThemeDock ? 'active' : ''}`}
          >
            <Palette size={16} strokeWidth={1.5} />
          </button>
          <button onClick={onLogout} title="Terminate Session" className="header-icon-btn header-logout header-desktop-only">
            <LogOut size={16} strokeWidth={1.5} />
          </button>

          {/* Mobile-only: Hamburger */}
          <button onClick={() => setShowMobileMenu(true)} title="Menu" className="header-icon-btn header-mobile-only">
            <Menu size={18} strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         TIER 2 — Context Header
         Desktop: floating console with label + tabs + view controls
         Mobile: full-width context bar with section title + swipeable tabs
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isContentView && (
        <div className="header-context">
          {/* Section title */}
          <div className="header-context-label">{sectionTitle}</div>

          <div className="header-context-controls">
            {/* Owner: channel switchboard tabs (swipeable on mobile) */}
            {isOwnerSession && (
              <div className="header-channel-bar">
                {visibleTabs.filter(t => !t.isOwner).map(tab => (
                  <button
                    key={tab.id}
                    className={`header-channel-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => { setActiveTab(tab.id); setActiveProjectId(null); resetFormState(); }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Non-owner: project tabs + chat (swipeable on mobile) */}
            {!isOwnerSession && (
              <div className="header-project-bar">
                {myProjects
                  .sort((a, b) => a.index - b.index)
                  .map((project) => (
                    <button
                      key={project.id}
                      className={`header-project-tab ${activeProjectId === project.id ? 'active' : ''}`}
                      onClick={() => { setActiveProjectId(project.id); resetFormState(); }}
                    >
                      {getTabLabel(project)}
                    </button>
                  ))}
                <button
                  className={`header-project-tab header-chat-tab ${isChatAnchor(activeProjectId) ? 'active' : ''}`}
                  onClick={() => { setActiveProjectId(getChatAnchorId(currentUserTab!.id)); resetFormState(); }}
                >
                  CHAT
                </button>
              </div>
            )}

            {/* View mode controls — desktop only */}
            {showViewControls && (
              <div className="header-view-toggle header-desktop-only">
                {([
                  { mode: 'list' as const, icon: <LayoutList size={13} />, label: 'List' },
                  { mode: 'grid-small' as const, icon: <Grid3X3 size={13} />, label: 'Grid' },
                  { mode: 'grid-big' as const, icon: <LayoutGrid size={13} />, label: 'Cards' },
                ]).map(v => (
                  <button
                    key={v.mode}
                    onClick={() => setViewMode(v.mode)}
                    className={`header-view-btn ${viewMode === v.mode ? 'active' : ''}`}
                    title={v.label}
                  >
                    {v.icon}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ━━━ Mobile Command Drawer ━━━ */}
      {showMobileMenu && (
        <>
          <div className="mobile-drawer-overlay" onClick={() => setShowMobileMenu(false)} />
          <div className="mobile-drawer">
            <div className="mobile-drawer-head">
              <span className="mobile-drawer-title">COMMAND MENU</span>
              <button onClick={() => setShowMobileMenu(false)} className="mobile-drawer-close">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className="mobile-drawer-identity">
              {signedInName} · {signedInRole}
            </div>

            {/* ── Quick Actions (displaced from Tier 1) ── */}
            <div className="mobile-drawer-section-label">QUICK ACTIONS</div>
            <div className="mobile-drawer-actions">
              <button
                onClick={() => { setActiveTab(DEMO_TAB_ID); resetFormState(); setShowMobileMenu(false); }}
                className={`mobile-drawer-action-btn ${activeTab === DEMO_TAB_ID ? 'active' : ''}`}
              >
                <Rocket size={14} />
                DEMO
              </button>
              <button onClick={() => { onOpenInfo(); setShowMobileMenu(false); }} className="mobile-drawer-action-btn">
                <Info size={14} />
                INFO
              </button>
              <button
                onClick={() => { setShowThemeDock(prev => !prev); setShowMobileMenu(false); }}
                className={`mobile-drawer-action-btn ${showThemeDock ? 'active' : ''}`}
              >
                <Palette size={14} />
                THEME
              </button>
              <button onClick={() => { onOpenAES(); setShowMobileMenu(false); }} className="mobile-drawer-action-btn">
                <Shield size={14} />
                AES
              </button>
            </div>

            {/* ── Channels / Tabs ── */}
            <div className="mobile-drawer-section-label">CHANNELS</div>
            {isOwnerSession ? (
              visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); resetFormState(); setShowMobileMenu(false); }}
                  className={`mobile-drawer-item ${activeTab === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))
            ) : (
              <>
                {myProjects
                  .sort((a, b) => a.index - b.index)
                  .map((project) => (
                    <button
                      key={project.id}
                      onClick={() => { setActiveProjectId(project.id); resetFormState(); setShowMobileMenu(false); }}
                      className={`mobile-drawer-item ${activeProjectId === project.id ? 'active' : ''}`}
                    >
                      {getTabLabel(project)}
                    </button>
                  ))}
                <button
                  onClick={() => { setActiveProjectId(getChatAnchorId(currentUserTab!.id)); resetFormState(); setShowMobileMenu(false); }}
                  className={`mobile-drawer-item ${isChatAnchor(activeProjectId) ? 'active' : ''}`}
                >
                  1:1 SECURE CHAT
                </button>
              </>
            )}

            {/* ── View Mode (mobile-only segmented control) ── */}
            {showViewControls && (
              <>
                <div className="mobile-drawer-section-label">VIEW MODE</div>
                <div className="mobile-drawer-view-seg">
                  {([
                    { mode: 'list' as const, icon: <LayoutList size={14} />, label: 'LIST' },
                    { mode: 'grid-small' as const, icon: <Grid3X3 size={14} />, label: 'GRID' },
                    { mode: 'grid-big' as const, icon: <LayoutGrid size={14} />, label: 'CARDS' },
                  ]).map(v => (
                    <button
                      key={v.mode}
                      onClick={() => { setViewMode(v.mode); setShowMobileMenu(false); }}
                      className={`mobile-drawer-seg-btn ${viewMode === v.mode ? 'active' : ''}`}
                    >
                      {v.icon}
                      {v.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="mobile-drawer-divider" />

            {/* ── System ── */}
            <div className="mobile-drawer-section-label">SYSTEM</div>
            <button
              onClick={() => { setActiveTab(SETTINGS_TAB_ID); resetFormState(); setShowMobileMenu(false); }}
              className={`mobile-drawer-item ${activeTab === SETTINGS_TAB_ID ? 'active' : ''}`}
            >
              Settings
            </button>
            <button
              onClick={() => { setShowMobileMenu(false); onLogout(); }}
              className="mobile-drawer-item mobile-drawer-logout"
            >
              Terminate Session
            </button>
          </div>
        </>
      )}
    </>
  );
};
