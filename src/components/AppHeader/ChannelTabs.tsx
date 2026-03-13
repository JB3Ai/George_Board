import React from 'react';

export interface ChannelTabsProps {
  tabs: string[];
  activeTab: string;
  onChange: (tab: string) => void;
}

export const ChannelTabs: React.FC<ChannelTabsProps> = ({ tabs, activeTab, onChange }) => (
  <nav className="flex items-center gap-1">
    {tabs.map((tab) => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={`tier2-tab ${activeTab === tab ? 'tier2-tab--active' : ''}`}
      >
        {tab}
      </button>
    ))}
  </nav>
);
