
import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, ExternalLink, Globe, Shield, ChefHat, MapPin } from 'lucide-react';
import { ClipboardItem, ItemType } from '../types';

interface DemoTabProps {
  items: ClipboardItem[];
}

export const DemoTab: React.FC<DemoTabProps> = ({ items }) => {
  const fixedShowcase = [
    {
      id: 'os3-grid-demo',
      type: ItemType.WEBPAGE,
      title: 'JB³Ai OS3Grid',
      description: 'OS3Grid launch path via ShieldAI intro.',
      siteName: 'OS3Grid',
      finalUrl: '/os3grid-shield-intro/',
      sameTab: true,
      icon: <Shield size={24} />,
      shieldGate: true
    },
    {
      id: 'dadchef-demo',
      type: ItemType.WEBPAGE,
      title: 'DadChefAi - Just for fun',
      description: 'DadChefAi showcase.',
      siteName: 'DadChefAi',
      finalUrl: '/dadchefai/',
      sameTab: true,
      icon: <ChefHat size={24} />,
      shieldGate: false
    },
    {
      id: 'kids-demo',
      type: ItemType.WEBPAGE,
      title: 'Kids-GoExplore-Gauteng-Edition',
      description: 'Kids GoExplore Gauteng interactive app.',
      siteName: 'Kids GoExplore',
      finalUrl: '/kids-goexplore/',
      sameTab: true,
      icon: <MapPin size={24} />,
      shieldGate: false
    },
    {
      id: 'dev-soon-a',
      type: ItemType.NOTE,
      title: 'Dev coming soon',
      description: 'Reserved slot for next internal demo build.',
      siteName: 'Development',
      finalUrl: '/',
      sameTab: true,
      icon: <Globe size={24} />,
      shieldGate: false
    },
    {
      id: 'dev-soon-b',
      type: ItemType.NOTE,
      title: 'Dev Coming soon',
      description: 'Reserved slot for next internal demo build.',
      siteName: 'Development',
      finalUrl: '/',
      sameTab: true,
      icon: <Globe size={24} />,
      shieldGate: false
    },
    {
      id: 'dev-soon-c',
      type: ItemType.NOTE,
      title: 'Dev Coming soon',
      description: 'Reserved slot for next internal demo build.',
      siteName: 'Development',
      finalUrl: '/',
      sameTab: true,
      icon: <Globe size={24} />,
      shieldGate: false
    }
  ];

  const cards = fixedShowcase;

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-48 text-center space-y-8 animate-in fade-in duration-1000">
        <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/10">
          <Rocket size={40} strokeWidth={1} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-medium text-white/40 uppercase tracking-widest">No Demos Configured</h3>
          <p className="text-xs text-white/10 tracking-premium uppercase font-bold">Mark assets as "Demo" in the JONO space to initialize this view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {cards.map((item, idx) => (
        <motion.button
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          onClick={() => {
            const target = item.finalUrl || '/';
            // In dev, ShieldAI gateway runs on port 5173; in prod, same origin
            const isDev = window.location.hostname === 'localhost';
            const shieldBase = isDev ? 'http://localhost:5173/os3grid/' : '/os3grid/';
            const shieldUrl = `${shieldBase}?redirect=${encodeURIComponent(target)}`;
            if (item.sameTab) {
              window.location.href = item.shieldGate ? shieldUrl : target;
              return;
            }
            window.open(item.shieldGate ? shieldUrl : target, '_blank');
          }}
          className="group relative flex flex-col items-start p-10 glass rounded-[2.5rem] border-white/5 hover:border-[#66FF66]/30 hover:bg-[#66FF66]/5 transition-all duration-500 text-left overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#66FF66]/5 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="flex items-center justify-between w-full mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-[#9AA3AD] group-hover:text-[#66FF66] group-hover:border-[#66FF66]/20 transition-all duration-500">
              {item.icon || <Globe size={24} />}
            </div>
            <div className="flex items-center gap-3">
              {item.shieldGate && (
                <span className="text-[8px] tracking-[0.2em] uppercase font-bold text-[#66FF66]/40 border border-[#66FF66]/10 px-3 py-1 rounded-full">
                  ShieldAI
                </span>
              )}
              <ExternalLink size={18} className="text-white/10 group-hover:text-[#66FF66] transition-colors" />
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] tracking-[0.4em] text-[#9AA3AD]/40 uppercase font-bold group-hover:text-[#66FF66]/60 transition-colors">
              {item.siteName || item.type}
            </p>
            <h3 className="text-2xl font-medium text-[#E6E6E6] leading-tight tracking-tight group-hover:text-white transition-colors">
              {item.title}
            </h3>
            {item.description && (
              <p className="text-sm text-[#9AA3AD]/60 line-clamp-2 leading-relaxed font-light">
                {item.description}
              </p>
            )}
          </div>

          <div className="mt-10 w-full h-[1px] bg-white/[0.04] group-hover:bg-[#66FF66]/20 transition-colors" />
          
          <div className="mt-6 flex items-center justify-between w-full">
            <span className="text-[9px] tracking-widest text-white/10 uppercase font-bold">Initialize Protocol</span>
            <div className="flex items-center gap-2">
               <div className="w-1 h-1 rounded-full bg-[#66FF66] animate-pulse" />
               <span className="text-[9px] tracking-widest text-[#66FF66] uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity">Ready</span>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
};
