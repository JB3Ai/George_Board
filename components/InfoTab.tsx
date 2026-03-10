
import React from 'react';
import { Shield, Activity, Lock, Database, HardDrive } from 'lucide-react';

export const InfoTab: React.FC = () => {
  const stats = [
    { label: 'Status', value: 'All systems running', icon: Activity },
    { label: 'Security', value: 'PIN-verified access', icon: Shield },
    { label: 'Storage', value: 'Encrypted and synced', icon: HardDrive },
    { label: 'Availability', value: 'Global, always on', icon: Database },
  ];

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-1000">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass p-8 rounded-3xl space-y-4">
            <stat.icon size={16} className="text-accent/40" strokeWidth={1} />
            <div className="space-y-1">
              <p className="text-[9px] tracking-premium text-primary/20 uppercase font-bold">{stat.label}</p>
              <p className="text-xs text-primary font-light">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-2xl space-y-10">
        <section className="space-y-4">
          <h4 className="text-[10px] tracking-ultra text-primary/40 uppercase font-bold">How it works</h4>
          <div className="h-[1px] w-12 bg-card/10" />
          <p className="text-sm text-primary/30 leading-relaxed font-light">
            This clipboard lets you save and organise links, notes, files, and tasks in one place. 
            When you paste a link, the system fetches a preview automatically. 
            Everything is synced across devices in real time.
          </p>
        </section>

        <section className="space-y-4">
          <h4 className="text-[10px] tracking-ultra text-primary/40 uppercase font-bold">Your content</h4>
          <div className="h-[1px] w-12 bg-card/10" />
          <p className="text-sm text-primary/30 leading-relaxed font-light">
            Only you can edit or delete your own items. 
            You can add context to any card using the Edit function, 
            and pin important items to keep them at the top.
          </p>
        </section>
      </div>
    </div>
  );
};
