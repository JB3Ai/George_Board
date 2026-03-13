import React from 'react';
import { ChannelTabs } from './ChannelTabs';
import { ProjectTabs, type ProjectTab } from './ProjectTabs';
import { GridViewSelector, type ViewMode } from './GridViewSelector';

export interface AppHeaderTier2Props {
  channelTabs: string[];
  activeChannel: string;
  projectTabs: ProjectTab[];
  activeProjectTab: string;
  viewMode: ViewMode;
  onChannelChange: (channel: string) => void;
  onProjectTabChange: (tab: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export const AppHeaderTier2: React.FC<AppHeaderTier2Props> = ({
  channelTabs,
  activeChannel,
  projectTabs,
  activeProjectTab,
  viewMode,
  onChannelChange,
  onProjectTabChange,
  onViewModeChange,
}) => (
  <div className="app-header-tier2">
    <ChannelTabs tabs={channelTabs} activeTab={activeChannel} onChange={onChannelChange} />
    <ProjectTabs tabs={projectTabs} activeTab={activeProjectTab} onChange={onProjectTabChange} />
    <GridViewSelector viewMode={viewMode} onChange={onViewModeChange} />
  </div>
);
