
import React from 'react';
import { Shield, Activity, Lock, Database, HardDrive } from 'lucide-react';

export const InfoTab: React.FC = () => {
  const stats = [
    { label: 'System Status', value: 'Operational', icon: Activity },
    { label: 'Security Tier', value: 'Level 4 (PIN+Verified)', icon: Shield },
    { label: 'Vault Storage', value: 'Encrypted JSONB', icon: HardDrive },
    { label: 'Node Region', value: 'Global Edge', icon: Database },
  ];

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-1000">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass p-8 rounded-3xl space-y-4">
            <stat.icon size={16} className="text-[#66FF66]/40" strokeWidth={1} />
            <div className="space-y-1">
              <p className="text-[9px] tracking-premium text-white/20 uppercase font-bold">{stat.label}</p>
              <p className="text-xs text-white font-light">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-2xl space-y-10">
        <section className="space-y-4">
          <h4 className="text-[10px] tracking-ultra text-white/40 uppercase font-bold">Operational Protocols</h4>
          <div className="h-[1px] w-12 bg-white/10" />
          <p className="text-sm text-white/30 leading-relaxed font-light">
            Clipboard is a specialized environment for stakeholder asset management. 
            All links are parsed via private proxy to prevent origin tracking. 
            The STORAGE tab acts as a global index for all rich media and web assets.
          </p>
        </section>

        <section className="space-y-4">
          <h4 className="text-[10px] tracking-ultra text-white/40 uppercase font-bold">Data Management</h4>
          <div className="h-[1px] w-12 bg-white/10" />
          <p className="text-sm text-white/30 leading-relaxed font-light">
            Every log entry is immutable except by the originating stakeholder. 
            Rich media (YouTube, Webpages) can be augmented with additional 
            observation context using the Edit function.
          </p>
        </section>
      </div>
    </div>
  );
};
