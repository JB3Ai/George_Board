import React from 'react';
import { LogOut, Info, Home, Settings, Palette, Menu, Search, X } from 'lucide-react';
import type { UserProject } from '../types';
import type { UserTab } from '../services/userRegistry';

const DEMO_TAB_ID = '__DEMO__';
const SETTINGS_TAB_ID = '__SETTINGS__';

const getChatAnchorId = (userId: string) => `${userId}_CHAT`;
const isChatAnchor = (id: string | null) => typeof id === 'string' && id.endsWith('_CHAT');

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

  return (
    <>
      {/* ─── Primary navigation bar ─── */}
      <nav className="nav-main flex items-center border border-edge rounded-2xl px-4 sm:px-6 py-4 gap-4 bg-card z-[100] relative">
        {/* OS3 header badge */}
        <button onClick={onOpenAES} className="aes-shield-btn flex-shrink-0" title="AES-256 Encryption">
          <img src={`${import.meta.env.BASE_URL}Media/landscape_header_icon.jpg`} alt="OS³ JB3Ai" className="h-10 rounded-lg object-contain" />
        </button>
        <button onClick={onOpenInfo} title="Info & Help" className="flex-shrink-0 text-muted/40 hover:text-cyan-400 transition-colors">
          <Info size={18} strokeWidth={1.5} />
        </button>

        {/* Project tabs + Chat for non-owner users — 8-slot grid */}
        {!isOwnerSession && (
          <div className="project-tab-container">
            {myProjects
              .sort((a, b) => a.index - b.index)
              .map((project) => (
                <button
                  key={project.id}
                  className={`tab-item ${activeProjectId === project.id ? 'active' : ''}`}
                  onClick={() => { setActiveProjectId(project.id); resetFormState(); }}
                >
                  TAB {project.index}
                </button>
              ))}
            {Array.from({ length: Math.max(0, 7 - myProjects.length) }).map((_, i) => (
              <span key={`empty-${i}`} className="tab-item tab-empty" />
            ))}
            <button
              className={`tab-item chat-anchor ${isChatAnchor(activeProjectId) ? 'active' : ''}`}
              onClick={() => { setActiveProjectId(getChatAnchorId(currentUserTab!.id)); resetFormState(); }}
            >
              CHAT
            </button>
          </div>
        )}

        {/* Pinned utility buttons — always visible */}
        <div className="header-utility-icons flex items-center gap-3 sm:gap-4 flex-shrink-0 border-l border-edge pl-4">
          <button
            onClick={() => {
              const homeTab = isOwnerSession ? 'JONO' : currentUserTab?.id;
              if (homeTab) { setActiveTab(homeTab); setActiveProjectId(null); }
              resetFormState(); setShowMobileMenu(false);
            }}
            title="Home"
            className={`transition-colors ${
              (activeTab === 'JONO' || activeTab === currentUserTab?.id) && activeTab !== DEMO_TAB_ID && activeTab !== SETTINGS_TAB_ID
                ? 'text-accent' : 'text-muted/40 hover:text-primary'
            }`}
          >
            <Home size={18} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => { setActiveTab(DEMO_TAB_ID); resetFormState(); setShowMobileMenu(false); }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] sm:text-[11px] tracking-[0.24em] uppercase transition-all font-bold whitespace-nowrap demo-pulse-glow ${
              activeTab === DEMO_TAB_ID
                ? 'text-accent border-accent/70 bg-accent/15'
                : 'text-accent/90 border-accent/30 bg-accent/10 hover:bg-accent/15 hover:border-accent/60'
            }`}
          >
            <span className="relative inline-flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70" style={{ backgroundColor: 'var(--accent-status)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--accent-status)' }} />
            </span>
            DEMO
          </button>
          <button
            onClick={() => { setActiveTab(SETTINGS_TAB_ID); resetFormState(); setShowMobileMenu(false); }}
            title="Settings"
            className={`settings-icon transition-colors ${
              activeTab === SETTINGS_TAB_ID ? 'text-accent' : 'text-muted/40 hover:text-primary'
            }`}
          >
            <Settings size={18} strokeWidth={1.5} />
          </button>
          {/* Session indicator — compact name/role badge */}
          <span className="hidden sm:inline-flex text-[8px] tracking-[0.15em] uppercase text-muted/40 font-bold border-l border-edge pl-3 whitespace-nowrap">
            {signedInName} · {signedInRole}
          </span>
          <button onClick={() => setShowMobileMenu(true)} title="Menu" className="sm:hidden text-muted/40 hover:text-accent transition-colors">
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setShowThemeDock(prev => !prev)}
            title={showThemeDock ? 'Hide Theme Selector' : 'Show Theme Selector'}
            className={`theme-toggle-icon transition-colors ${showThemeDock ? 'text-accent' : 'text-muted/40 hover:text-primary'}`}
          >
            <Palette size={18} strokeWidth={1.5} />
          </button>
          <button onClick={onLogout} title="Terminate Session" className="desktop-only-action text-muted/40 hover:text-red-400 transition-colors">
            <LogOut size={18} strokeWidth={1.5} />
          </button>
        </div>
      </nav>

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
            {/* Session indicator — mobile */}
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
                      TAB {project.index}
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
