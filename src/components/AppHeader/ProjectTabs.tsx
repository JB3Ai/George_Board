import React from 'react';
import { MessageSquare, Settings as GearIcon } from 'lucide-react';

export interface ProjectTab {
  id: string;
  label: string;
}

export interface ProjectTabsProps {
  tabs: ProjectTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

/**
 * Render order: HOME → custom project tabs → CHAT → CONFIG
 * Empty slots are never rendered — the row collapses left automatically.
 */
export const ProjectTabs: React.FC<ProjectTabsProps> = ({ tabs, activeTab, onChange }) => {
  const home = tabs.find((t) => t.id === 'HOME');
  const chat = tabs.find((t) => t.id === 'CHAT');
  const config = tabs.find((t) => t.id === 'CONFIG');
  const projects = tabs.filter((t) => t.id !== 'HOME' && t.id !== 'CHAT' && t.id !== 'CONFIG');

  const ordered = [home, ...projects, chat, config].filter(Boolean) as ProjectTab[];

  return (
    <nav className="flex items-center justify-center gap-1">
      {ordered.map((tab) => {
        const isActive = activeTab === tab.id;
        const icon =
          tab.id === 'CHAT' ? <MessageSquare size={12} className="mr-1.5 opacity-60" /> :
          tab.id === 'CONFIG' ? <GearIcon size={12} className="mr-1.5 opacity-60" /> :
          null;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`tier2-tab ${isActive ? 'tier2-tab--active' : ''}`}
          >
            {icon}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};
