import React from 'react';
import { LogOut, Info, Home, Settings, Palette, Menu, X, LayoutList, Grid3X3, LayoutGrid, Shield, Rocket, MessageCircle } from 'lucide-react';
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
         Desktop: full controls · Mobile: identity + menu
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

        {/* Right: System controls + always-visible view toggle */}
        <div className="header-system-right">
          {/* View mode toggle — always visible for owner and user */}
          {showViewControls && (
            <div className="header-view-toggle">
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

          {/* Desktop-only: Settings (owner only), Palette, Logout */}
          {isOwnerSession && (
            <button
              onClick={() => { setActiveTab(SETTINGS_TAB_ID); resetFormState(); setShowMobileMenu(false); }}
              title="Settings"
              className={`header-icon-btn header-desktop-only ${activeTab === SETTINGS_TAB_ID ? 'active' : ''}`}
            >
              <Settings size={16} strokeWidth={1.5} />
            </button>
          )}
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
         Fixed tab layout: HOME | project tabs | CHAT | SETTINGS(owner)
         Always shown except on the DEMO splash tab.
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab !== DEMO_TAB_ID && (
        <div className="header-context">
          {/* Section title */}
          <div className="header-context-label">{sectionTitle}</div>

          <div className="header-context-controls">
            {/* Owner: channel switchboard tabs (swipeable on mobile) + TAB6=SETTINGS */}
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
                {/* TAB6: SETTINGS — fixed, owner-only */}
                <button
                  className={`header-channel-tab header-settings-tab ${activeTab === SETTINGS_TAB_ID ? 'active' : ''}`}
                  onClick={() => { setActiveTab(SETTINGS_TAB_ID); resetFormState(); }}
                  title="Settings (TAB6)"
                >
                  <Settings size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  SETTINGS
                </button>
              </div>
            )}

            {/* Non-owner: fixed layout — HOME | P2 | P3 | P4 | CHAT | SETTINGS(owner) */}
            {!isOwnerSession && currentUserTab && (
              <div className="header-project-bar">
                {/* TAB1: HOME (always first) */}
                {myProjects
                  .filter(p => p.index === 1)
                  .map((project) => (
                    <button
                      key={project.id}
                      className={`header-project-tab ${activeProjectId === project.id ? 'active' : ''}`}
                      onClick={() => { setActiveProjectId(project.id); resetFormState(); }}
                    >
                      HOME
                    </button>
                  ))}
                {/* TAB2–TAB4: project tabs (sorted by index) */}
                {myProjects
                  .filter(p => p.index > 1)
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
                {/* TAB5: CHAT (always fifth) */}
                <button
                  className={`header-project-tab header-chat-tab ${isChatAnchor(activeProjectId) ? 'active' : ''}`}
                  onClick={() => { setActiveProjectId(getChatAnchorId(currentUserTab.id)); resetFormState(); }}
                >
                  <MessageCircle size={12} />
                  CHAT
                </button>
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
                {/* Fixed layout mirrored: HOME, project tabs, CHAT */}
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

            <div className="mobile-drawer-divider" />

            {/* ── System ── */}
            <div className="mobile-drawer-section-label">SYSTEM</div>
            {isOwnerSession && (
              <button
                onClick={() => { setActiveTab(SETTINGS_TAB_ID); resetFormState(); setShowMobileMenu(false); }}
                className={`mobile-drawer-item ${activeTab === SETTINGS_TAB_ID ? 'active' : ''}`}
              >
                Settings
              </button>
            )}
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
