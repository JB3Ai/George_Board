
import React from 'react';
import { ClipboardItem, UserEmail } from '../types';
import { Card } from './Card';

interface PinboardLaneProps {
  items: ClipboardItem[];
  currentUser: UserEmail;
  onUpdate: (id: string, updates: Partial<ClipboardItem>) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ClipboardItem) => void;
  onRefresh: (id: string) => void;
}

export const PinboardLane: React.FC<PinboardLaneProps> = ({ items, currentUser, onUpdate, onDelete, onEdit, onRefresh }) => {
  const pinned = items.filter(i => i.isPinned);
  const unpinned = items.filter(i => !i.isPinned);

  return (
    <div className="flex flex-col gap-24">
      {pinned.length > 0 && (
        <section className="space-y-10">
          <div className="flex items-center gap-6">
            <h4 className="text-[11px] tracking-[0.4em] text-[#66FF66]/60 uppercase font-bold">Priority Assets</h4>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-[#66FF66]/10 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {pinned.map(item => (
              <div key={item.id}>
                <Card item={item} currentUser={currentUser} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} onRefresh={onRefresh} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-10">
        <div className="flex items-center gap-6">
          <h4 className="text-[11px] tracking-[0.4em] text-[#9AA3AD]/30 uppercase font-bold">Active Records</h4>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-white/5 to-transparent" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {unpinned.map(item => (
            <div key={item.id}>
              <Card item={item} currentUser={currentUser} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} onRefresh={onRefresh} />
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full py-48 text-center border border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.01]">
              <p className="text-[11px] text-[#9AA3AD]/20 tracking-[0.6em] uppercase font-bold">Awaiting initialization</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
