
import React, { useEffect, useState } from 'react';
import { Shield, Activity, Lock, Database, HardDrive, ChevronDown, CheckCircle2 } from 'lucide-react';

export const InfoTab: React.FC = () => {
  const stats = [
    { label: 'System Status', value: 'Operational', icon: Activity },
    { label: 'Security Tier', value: 'Level 4 (PIN+Verified)', icon: Shield },
    { label: 'Vault Storage', value: 'Encrypted JSONB', icon: HardDrive },
    { label: 'Node Region', value: 'Global Edge', icon: Database },
  ];

  const sections = [
    {
      id: 'operational',
      title: 'Operational Protocols',
      body: `Clipboard is a specialized environment for stakeholder asset management. All links are parsed via private proxy to prevent origin tracking. The STORAGE tab acts as a global index for all rich media and web assets.`,
    },
    {
      id: 'data',
      title: 'Data Management',
      body: `Every log entry is immutable except by the originating stakeholder. Rich media (YouTube, Webpages) can be augmented with additional observation context using the Edit function.`,
    },
    {
      id: 'review',
      title: 'Review Checklist',
      body: `Use this panel as your pre-flight check: confirm POPIA/security acceptance, load your counterpart lane, and skim the STORAGE tab for any newly enriched links before a session.`,
    },
  ] as const;

  const [openSectionId, setOpenSectionId] = useState<string | null>(sections[0]?.id ?? null);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('jb3_info_reviewed');
      if (raw) {
        setReviewed(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('jb3_info_reviewed', JSON.stringify(reviewed));
    } catch {
      // ignore
    }
  }, [reviewed]);

  const reviewedCount = sections.filter(s => reviewed[s.id]).length;
  const totalSections = sections.length;
  const progress = totalSections === 0 ? 0 : Math.round((reviewedCount / totalSections) * 100);

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

      <div className="max-w-2xl space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-ultra text-white/40 uppercase font-bold">Reading Progress</p>
            <span className="text-[10px] tracking-[0.2em] text-[#9AA3AD]/50 uppercase font-mono">
              {reviewedCount}/{totalSections} modules • {progress}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.03] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#66FF66] to-[#39FF88] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {sections.map(section => {
            const isOpen = openSectionId === section.id;
            const isReviewed = !!reviewed[section.id];
            return (
              <section
                key={section.id}
                className="glass rounded-3xl border border-white/[0.06] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenSectionId(isOpen ? null : section.id)}
                  className="w-full flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#66FF66]/40" />
                    <span className="text-[10px] tracking-ultra text-white/60 uppercase font-bold">
                      {section.title}
                    </span>
                    {isReviewed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#66FF66]/10 border border-[#66FF66]/30 text-[9px] tracking-[0.18em] text-[#66FF66] uppercase font-bold">
                        <CheckCircle2 size={10} className="shrink-0" />
                        Reviewed
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 space-y-4 border-t border-white/[0.06]">
                    <p className="text-sm text-white/40 leading-relaxed font-light">
                      {section.body}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setReviewed(prev => ({
                            ...prev,
                            [section.id]: !isReviewed,
                          }))
                        }
                        className={`text-[10px] tracking-[0.2em] uppercase font-bold px-4 py-2 rounded-full border transition-all ${
                          isReviewed
                            ? 'bg-[#66FF66]/10 border-[#66FF66]/40 text-[#66FF66]'
                            : 'bg-white/5 border-white/10 text-[#9AA3AD] hover:border-white/30'
                        }`}
                      >
                        {isReviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed'}
                      </button>
                      <span className="text-[9px] tracking-[0.2em] text-[#9AA3AD]/40 uppercase">
                        Micro Log • Info lane
                      </span>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
