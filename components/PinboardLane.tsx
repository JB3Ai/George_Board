
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardItem, UserEmail } from '../types';
import { Card } from './Card';

interface PinboardLaneProps {
  items: ClipboardItem[];
  currentUser: UserEmail;
  canManageAll?: boolean;
  viewMode?: 'grid-big' | 'grid-small' | 'list';
  onUpdate: (id: string, updates: Partial<ClipboardItem>) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ClipboardItem) => void;
  onRefresh: (id: string) => void;
  onShare?: (item: ClipboardItem) => void;
}

export const PinboardLane: React.FC<PinboardLaneProps> = ({ items, currentUser, canManageAll = false, viewMode = 'grid-big', onUpdate, onDelete, onEdit, onRefresh, onShare }) => {
  const pinned = items.filter(i => i.isPinned);
  const unpinned = items.filter(i => !i.isPinned);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.4 } }
  };

  const gridClass = viewMode === 'list'
    ? 'flex flex-col gap-2'
    : viewMode === 'grid-small'
    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
    : 'grid grid-cols-1 md:grid-cols-2 gap-10';

  return (
    <div className="flex flex-col gap-24">
      <AnimatePresence mode="popLayout">
        {pinned.length > 0 && (
          <motion.section 
            key="pinned-section"
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="space-y-10"
          >
            <div className="flex items-center gap-6">
              <h4 className="text-[11px] tracking-[0.4em] text-accent/60 uppercase font-bold">Priority Assets</h4>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-accent/10 to-transparent" />
            </div>
            <div className={gridClass}>
              {pinned.map(item => (
                <motion.div key={item.id} variants={itemVariants} layout>
                  <Card item={item} currentUser={currentUser} canManageAll={canManageAll} viewMode={viewMode} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} onRefresh={onRefresh} onShare={onShare} />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        <motion.section 
          key="log-section"
          initial="hidden"
          animate="show"
          variants={containerVariants}
          className="space-y-10"
        >
          <div className="flex items-center gap-6">
            <h4 className="text-[11px] tracking-[0.4em] text-accent/60 uppercase font-bold">Active Records</h4>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/5 to-transparent" />
          </div>
          <div className={gridClass}>
            <AnimatePresence mode="popLayout">
              {unpinned.map(item => (
                <motion.div key={item.id} variants={itemVariants} layout>
                  <Card item={item} currentUser={currentUser} canManageAll={canManageAll} viewMode={viewMode} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} onRefresh={onRefresh} onShare={onShare} />
                </motion.div>
              ))}
            </AnimatePresence>
            {items.length === 0 && (
              <motion.div 
                variants={itemVariants}
                className="col-span-full py-48 text-center border border-dashed border-edge rounded-[2.5rem] bg-card/5"
              >
                <p className="text-[11px] text-muted/20 tracking-[0.6em] uppercase font-bold">Awaiting initialization</p>
              </motion.div>
            )}
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
};
