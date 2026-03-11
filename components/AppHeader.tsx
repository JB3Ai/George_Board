import React from 'react';
import { LogOut, Info, Home, Settings, Palette, Menu, Search, X, LayoutList, Grid3X3, LayoutGrid, Shield } from 'lucide-react';
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
      {/* ━━━ TIER 1 — System Header (solid, compact, same for everyone) ━━━ */}
      <nav className="header-system">
        {/* Left: OS³ Security Badge */}
        <div className="header-system-left">
          <button onClick={onOpenAES} className="header-badge-btn" title="AES-256 Encryption">
            <Shield size={14} />
            <span className="header-badge-label">OS³ AES-256</span>
          </button>
          <button onClick={onOpenInfo} title="Info & Help" className="header-icon-btn">
            <Info size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Right: System controls */}
        <div className="header-system-right">
          <button
            onClick={() => { setActiveTab(DEMO_TAB_ID); resetFormState(); setShowMobileMenu(false); }}
            className={`header-demo-chip ${activeTab === DEMO_TAB_ID ? 'active' : ''}`}
          >
            <span className="header-demo-dot" />
            DEMO
          </button>
          <span className="header-session-badge hidden sm:inline-flex">
            {signedInName} · {signedInRole}
          </span>
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
          <button
            onClick={() => { setActiveTab(SETTINGS_TAB_ID); resetFormState(); setShowMobileMenu(false); }}
            title="Settings"
            className={`header-icon-btn ${activeTab === SETTINGS_TAB_ID ? 'active' : ''}`}
          >
            <Settings size={16} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setShowThemeDock(prev => !prev)}
            title={showThemeDock ? 'Hide Theme Selector' : 'Show Theme Selector'}
            className={`header-icon-btn ${showThemeDock ? 'active' : ''}`}
          >
            <Palette size={16} strokeWidth={1.5} />
          </button>
          <button onClick={onLogout} title="Terminate Session" className="header-icon-btn header-logout hidden sm:flex">
            <LogOut size={16} strokeWidth={1.5} />
          </button>
          <button onClick={() => setShowMobileMenu(true)} title="Menu" className="header-icon-btn sm:hidden">
            <Menu size={18} strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      {/* ━━━ TIER 2 — Context Header (floating console, role-dependent) ━━━ */}
      {isContentView && (
        <div className="header-context">
          {/* Context label */}
          <div className="header-context-label">{sectionTitle}</div>

          <div className="header-context-controls">
            {/* Owner: channel switchboard tabs */}
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

            {/* Non-owner: project tabs + chat */}
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

            {/* View mode controls */}
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
          </div>
        </div>
      )}

      {/* ─── Mobile slide-out drawer ─── */}
      {showMobileMenu && (
        <>
          <div className="mobile-drawer-overlay" onClick={() => setShowMobileMenu(false)} />
          <div className="mobile-drawer">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] tracking-[0.3em] uppercase text-muted font-bold">Menu</span>
              <button onClick={() => setShowMobileMenu(false)} className="text-muted hover:text-primary transition-colors">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <div className="text-[9px] tracking-[0.15em] uppercase text-muted/40 font-bold mb-3 px-4">
              {signedInName} · {signedInRole}
            </div>
            {isOwnerSession ? (
              visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); resetFormState(); setShowMobileMenu(false); }}
                  className={`w-full text-left text-[10px] tracking-[0.25em] uppercase py-3 px-4 rounded-xl transition-all font-bold ${
                    activeTab === tab.id ? 'text-accent bg-accent/10 border border-accent/20' : 'text-muted hover:text-primary hover:bg-card/10 border border-transparent'
                  }`}
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
                      className={`w-full text-left text-[10px] tracking-[0.25em] uppercase py-3 px-4 rounded-xl transition-all font-bold ${
                        activeProjectId === project.id ? 'text-accent bg-accent/10 border border-accent/20' : 'text-muted hover:text-primary hover:bg-card/10 border border-transparent'
                      }`}
                    >
                      {getTabLabel(project)}
                    </button>
                  ))}
                <button
                  onClick={() => { setActiveProjectId(getChatAnchorId(currentUserTab!.id)); resetFormState(); setShowMobileMenu(false); }}
                  className={`w-full text-left text-[10px] tracking-[0.25em] uppercase py-3 px-4 rounded-xl transition-all font-bold ${
                    isChatAnchor(activeProjectId) ? 'text-accent bg-accent/10 border border-accent/20' : 'text-muted hover:text-primary hover:bg-card/10 border border-transparent'
                  }`}
                >
                  1:1 SECURE CHAT
                </button>
              </>
            )}
            <div className="h-px bg-edge my-2" />
            <button
              onClick={() => { setActiveTab(SETTINGS_TAB_ID); resetFormState(); setShowMobileMenu(false); }}
              className={`w-full text-left text-[10px] tracking-[0.25em] uppercase py-3 px-4 rounded-xl transition-all font-bold ${
                activeTab === SETTINGS_TAB_ID ? 'text-accent bg-accent/10 border border-accent/20' : 'text-muted hover:text-primary hover:bg-card/10 border border-transparent'
              }`}
            >
              Settings
            </button>
            <div className="h-px bg-edge my-2" />
            <button
              onClick={() => { setShowMobileMenu(false); onLogout(); }}
              className="w-full text-left text-[10px] tracking-[0.25em] uppercase py-3 px-4 rounded-xl transition-all font-bold text-red-400/70 hover:bg-red-500/10 border border-transparent"
            >
              Log Out
            </button>
          </div>
        </>
      )}
    </>
  );
};
