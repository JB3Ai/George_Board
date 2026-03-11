import React from 'react';
import { Plus, RotateCcw, Search } from 'lucide-react';
import type { ClipboardItem } from '../types';
import { ItemType, TaskStatus } from '../types';

interface ControlTowerProps {
  items: ClipboardItem[];
  isOwner: boolean;
  activeChannel: string;
  canPost: boolean;
  onNewEntry: () => void;
  onSearch: () => void;
  onResetVisibility?: () => void;
}

export const ControlTower: React.FC<ControlTowerProps> = ({
  items,
  isOwner,
  activeChannel,
  canPost,
  onNewEntry,
  onSearch,
  onResetVisibility,
}) => {
  const tasks = items.filter(i => i.type === ItemType.TASK);
  const pending = tasks.filter(t => t.taskStatus !== TaskStatus.DONE).length;
  const done = tasks.filter(t => t.taskStatus === TaskStatus.DONE).length;
  const events = items.filter(i => i.type === ItemType.EVENT).length;
  const notes = items.filter(i => i.type === ItemType.NOTE).length;
  const docs = items.filter(i => i.type === ItemType.DOCUMENT || i.type === ItemType.IMAGE || i.type === ItemType.VIDEO).length;

  return (
    <>
      {/* Control Deck */}
      <div className="ct-module">
        <div className="ct-module-header">
          <span className="ct-module-title">Control Deck</span>
        </div>
        <div className="ct-module-body">
          <div className="ct-action-row">
            {canPost && (
              <button className="ct-action-btn primary" onClick={onNewEntry}>
                <Plus size={12} />
                NEW ENTRY
              </button>
            )}
            <button className="ct-action-btn" onClick={onSearch}>
              <Search size={12} />
              SEARCH
            </button>
            {isOwner && onResetVisibility && activeChannel !== 'JONO' && (
              <button className="ct-action-btn" onClick={onResetVisibility}>
                <RotateCcw size={12} />
                RESET VIS
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Execution Queue */}
      <div className="ct-module">
        <div className="ct-module-header">
          <span className="ct-module-title">Execution Queue</span>
        </div>
        <div className="ct-module-body">
          {pending > 0 && (
            <div className="ct-queue-item">
              <span className="ct-queue-label">Tasks Pending</span>
              <span className="ct-queue-badge pending">{pending}</span>
            </div>
          )}
          {done > 0 && (
            <div className="ct-queue-item">
              <span className="ct-queue-label">Tasks Complete</span>
              <span className="ct-queue-badge">{done}</span>
            </div>
          )}
          {events > 0 && (
            <div className="ct-queue-item">
              <span className="ct-queue-label">Events</span>
              <span className="ct-queue-badge">{events}</span>
            </div>
          )}
          {pending === 0 && done === 0 && events === 0 && (
            <div className="ct-queue-item">
              <span className="ct-queue-label" style={{ opacity: 0.3 }}>Queue Empty</span>
            </div>
          )}
        </div>
      </div>

      {/* System Metrics */}
      <div className="ct-module">
        <div className="ct-module-header">
          <span className="ct-module-title">System Metrics</span>
        </div>
        <div className="ct-module-body">
          <div className="ct-metric-row">
            <span className="ct-metric-label">Notes</span>
            <span className="ct-metric-value">{notes}</span>
          </div>
          <div className="ct-metric-row">
            <span className="ct-metric-label">Tasks</span>
            <span className="ct-metric-value">{tasks.length}</span>
          </div>
          <div className="ct-metric-row">
            <span className="ct-metric-label">Media / Docs</span>
            <span className="ct-metric-value">{docs}</span>
          </div>
          <div className="ct-metric-row">
            <span className="ct-metric-label">Total Records</span>
            <span className="ct-metric-value">{items.length}</span>
          </div>
          {items.length > 0 && (
            <div className="ct-metric-bar">
              <div
                className="ct-metric-fill"
                style={{ width: `${Math.min(100, (tasks.length / items.length) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
