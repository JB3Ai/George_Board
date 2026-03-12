
import React from 'react';
import { ShieldAlert, RefreshCw, KeyRound, Smartphone, Palette, Type, Play, Download, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { UserSession, UserProject, Theme, FontSize } from '../types';
import { useUI } from '../src/context/UIContext';

interface SettingsTabProps {
  session: UserSession;
  onResetPin: () => void;
  projects?: UserProject[];
  onRenameProject?: (projectId: string, currentName: string) => void;
  onDeleteProject?: (projectId: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ session, onResetPin, projects, onRenameProject, onDeleteProject }) => {
  const isTrusted = session.trustUntil && session.trustUntil > Date.now();
  const trustExpiry = isTrusted ? new Date(session.trustUntil!).toLocaleDateString() : 'N/A';
  const { theme, fontSize, welcomeVideoEnabled, installGuideEnabled, setTheme, setFontSize, setWelcomeVideoEnabled, setInstallGuideEnabled } = useUI();

  return (
    <div className="max-w-xl space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-1000">
      <div className="space-y-4">
        <h4 className="text-[10px] tracking-ultra text-primary/40 uppercase font-bold">Identity & Session</h4>
        <div className="h-[1px] w-12 bg-card/20" />
      </div>

      <div className="space-y-6">
        <div className="glass p-8 rounded-3xl flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-card/10 border border-edge flex items-center justify-center text-primary/20">
              <Smartphone size={20} strokeWidth={1} />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] tracking-premium text-primary/20 uppercase font-bold">Trusted Status</p>
              <p className="text-sm text-primary font-light">{isTrusted ? 'Trusted device' : 'Session only'}</p>
            </div>
          </div>
          {isTrusted && (
            <span className="text-[9px] tracking-widest text-primary/10 uppercase">Expires {trustExpiry}</span>
          )}
        </div>

        <div className="glass p-8 rounded-3xl flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-card/10 border border-edge flex items-center justify-center text-primary/20">
              <KeyRound size={20} strokeWidth={1} />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] tracking-premium text-primary/20 uppercase font-bold">PIN Credentials</p>
              <p className="text-sm text-primary font-light">Protected</p>
            </div>
          </div>
          <button 
            onClick={onResetPin}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-red-500/10 text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all text-[9px] tracking-widest uppercase font-bold"
          >
            <RefreshCw size={12} />
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] tracking-ultra text-primary/40 uppercase font-bold">Interface Customization</h4>
        <div className="h-[1px] w-12 bg-card/20" />
      </div>

      <div className="space-y-6">
        <div className="glass p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-card/10 border border-edge flex items-center justify-center text-primary/20">
              <Palette size={20} strokeWidth={1} />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] tracking-premium text-primary/20 uppercase font-bold">Visual Theme</p>
              <p className="text-sm text-primary font-light">Select Environment</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Object.values(Theme).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`py-3 rounded-xl border text-[9px] tracking-widest uppercase transition-all ${
                  theme === t
                  ? 'settings-option-active font-extrabold text-primary'
                  : 'border-edge text-primary/20 hover:text-primary/40 hover:border-edge font-bold'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="glass p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-card/10 border border-edge flex items-center justify-center text-primary/20">
              <Type size={20} strokeWidth={1} />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] tracking-premium text-primary/20 uppercase font-bold">Typography</p>
              <p className="text-sm text-primary font-light">Font Scale</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.values(FontSize).map(s => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                className={`py-3 rounded-xl border text-[9px] tracking-widest uppercase transition-all ${
                  fontSize === s 
                  ? 'settings-option-active font-extrabold text-primary' 
                  : 'border-edge text-primary/20 hover:text-primary/40 hover:border-edge font-bold'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] tracking-ultra text-primary/40 uppercase font-bold">Experience</h4>
        <div className="h-[1px] w-12 bg-card/20" />
      </div>

      <div className="space-y-6">
        <div className="glass p-8 rounded-3xl flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-card/10 border border-edge flex items-center justify-center text-primary/20">
              <Play size={20} strokeWidth={1} />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] tracking-premium text-primary/20 uppercase font-bold">Welcome Video</p>
              <p className="text-sm text-primary font-light">{welcomeVideoEnabled ? 'Plays on sign-in' : 'Skipped'}</p>
            </div>
          </div>
          <button
            onClick={() => setWelcomeVideoEnabled(!welcomeVideoEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${welcomeVideoEnabled ? 'bg-green-500/60' : 'bg-primary/10'}`}
            aria-label="Toggle welcome video"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${welcomeVideoEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="glass p-8 rounded-3xl flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-card/10 border border-edge flex items-center justify-center text-primary/20">
              <Download size={20} strokeWidth={1} />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] tracking-premium text-primary/20 uppercase font-bold">Install Guide</p>
              <p className="text-sm text-primary font-light">{installGuideEnabled ? 'Shows after sign-in' : 'Skipped'}</p>
            </div>
          </div>
          <button
            onClick={() => setInstallGuideEnabled(!installGuideEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${installGuideEnabled ? 'bg-green-500/60' : 'bg-primary/10'}`}
            aria-label="Toggle install guide"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${installGuideEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* ─── Project Tab Management ─── */}
      {projects && projects.length > 0 && (
        <>
          <div className="space-y-4">
            <h4 className="text-[10px] tracking-ultra text-primary/40 uppercase font-bold">Project Tabs</h4>
            <div className="h-[1px] w-12 bg-card/20" />
          </div>

          <div className="space-y-3">
            {projects
              .sort((a, b) => a.index - b.index)
              .map((project) => {
                const isHome = project.index === 1;
                const label = isHome ? 'HOME' : (project.name.startsWith('Project ') ? `TAB${project.index}` : project.name);
                return (
                  <div key={project.id} className="glass p-6 rounded-3xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-card/10 border border-edge flex items-center justify-center text-primary/20">
                        <FolderOpen size={16} strokeWidth={1} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] tracking-premium text-primary/20 uppercase font-bold">
                          {isHome ? 'System Tab' : `Slot ${project.index}`}
                        </p>
                        <p className="text-sm text-primary font-light">{label}</p>
                      </div>
                    </div>
                    {!isHome && (
                      <div className="flex items-center gap-2">
                        {onRenameProject && (
                          <button
                            onClick={() => onRenameProject(project.id, project.name)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-edge text-primary/30 hover:text-primary hover:border-primary/20 transition-all text-[9px] tracking-widest uppercase font-bold"
                            title="Rename tab"
                          >
                            <Pencil size={10} />
                            Rename
                          </button>
                        )}
                        {onDeleteProject && (
                          <button
                            onClick={() => onDeleteProject(project.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-500/10 text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all text-[9px] tracking-widest uppercase font-bold"
                            title="Delete tab"
                          >
                            <Trash2 size={10} />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}

      <div className="glass p-8 rounded-3xl">
        <div className="flex items-start gap-4">
          <ShieldAlert size={16} className="text-primary/10 mt-1" strokeWidth={1} />
          <div className="space-y-2">
            <p className="text-[10px] tracking-widest text-primary/40 uppercase font-bold">Security Advisory</p>
            <p className="text-[11px] text-primary/20 leading-relaxed font-light">
              Resetting your PIN will sign you out on all devices. 
              You will need to verify your identity again before you can sign back in. 
              Only reset your PIN on a device you trust.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
