
import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, ExternalLink, Globe, Youtube } from 'lucide-react';
import { ClipboardItem, ItemType } from '../types';

interface DemoTabProps {
  items: ClipboardItem[];
}

export const DemoTab: React.FC<DemoTabProps> = ({ items }) => {
  const demoItems = items.filter(i => i.isDemo);

  if (demoItems.length === 0) {
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
      {demoItems.map((item, idx) => (
        <motion.button
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          onClick={() => window.open(item.content, '_blank')}
          className="group relative flex flex-col items-start p-10 glass rounded-[2.5rem] border-white/5 hover:border-[#66FF66]/30 hover:bg-[#66FF66]/5 transition-all duration-500 text-left overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#66FF66]/5 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="flex items-center justify-between w-full mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-[#9AA3AD] group-hover:text-[#66FF66] group-hover:border-[#66FF66]/20 transition-all duration-500">
              {item.type === ItemType.YOUTUBE ? <Youtube size={24} /> : <Globe size={24} />}
            </div>
            <ExternalLink size={18} className="text-white/10 group-hover:text-[#66FF66] transition-colors" />
          </div>

          <div className="space-y-4">
            <p className="text-[10px] tracking-[0.4em] text-[#9AA3AD]/40 uppercase font-bold group-hover:text-[#66FF66]/60 transition-colors">
              {item.metadata?.siteName || item.type}
            </p>
            <h3 className="text-2xl font-medium text-[#E6E6E6] leading-tight tracking-tight group-hover:text-white transition-colors">
              {item.metadata?.title || item.title}
            </h3>
            {item.metadata?.description && (
              <p className="text-sm text-[#9AA3AD]/60 line-clamp-2 leading-relaxed font-light">
                {item.metadata.description}
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
