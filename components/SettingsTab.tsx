
import React from 'react';
import { ShieldAlert, RefreshCw, KeyRound, Smartphone, Palette, Type } from 'lucide-react';
import { UserSession, Theme, FontSize } from '../types';
import { useUI } from '../src/context/UIContext';

interface SettingsTabProps {
  session: UserSession;
  onResetPin: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ session, onResetPin }) => {
  const isTrusted = session.trustUntil && session.trustUntil > Date.now();
  const trustExpiry = isTrusted ? new Date(session.trustUntil!).toLocaleDateString() : 'N/A';
  const { theme, fontSize, setTheme, setFontSize } = useUI();

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
              <p className="text-sm text-primary font-light">{isTrusted ? 'Active Device' : 'Volatile Session'}</p>
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
              <p className="text-sm text-primary font-light">Securely Hash-Linked</p>
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
                className={`py-3 rounded-xl border text-[9px] tracking-widest uppercase font-bold transition-all ${
                  theme === t
                  ? 'bg-card/20 border-edge text-primary'
                  : 'border-edge text-primary/20 hover:text-primary/40 hover:border-edge'
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
                className={`py-3 rounded-xl border text-[9px] tracking-widest uppercase font-bold transition-all ${
                  fontSize === s 
                  ? 'bg-card/20 border-edge text-primary' 
                  : 'border-edge text-primary/20 hover:text-primary/40 hover:border-edge'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass p-8 rounded-3xl">
        <div className="flex items-start gap-4">
          <ShieldAlert size={16} className="text-primary/10 mt-1" strokeWidth={1} />
          <div className="space-y-2">
            <p className="text-[10px] tracking-widest text-primary/40 uppercase font-bold">Security Advisory</p>
            <p className="text-[11px] text-primary/20 leading-relaxed font-light">
              Resetting your PIN will terminate all active sessions across all devices. 
              You will be required to verify your identity via a fresh magic link. 
              Always ensure you are using a private connection when managing gate credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
