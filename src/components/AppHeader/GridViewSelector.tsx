import React from 'react';
import { LayoutGrid, List, Kanban } from 'lucide-react';

export type ViewMode = 'grid' | 'list' | 'board';

export interface GridViewSelectorProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const modes: { mode: ViewMode; icon: React.ReactNode; title: string }[] = [
  { mode: 'grid',  icon: <LayoutGrid size={14} />, title: 'Grid view' },
  { mode: 'list',  icon: <List size={14} />,       title: 'List view' },
  { mode: 'board', icon: <Kanban size={14} />,     title: 'Board view' },
];

export const GridViewSelector: React.FC<GridViewSelectorProps> = ({ viewMode, onChange }) => (
  <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] p-0.5">
    {modes.map(({ mode, icon, title }) => (
      <button
        key={mode}
        onClick={() => onChange(mode)}
        title={title}
        className={`view-btn ${viewMode === mode ? 'view-btn--active' : ''}`}
      >
        {icon}
      </button>
    ))}
  </div>
);
