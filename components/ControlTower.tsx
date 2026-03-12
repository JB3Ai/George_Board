import React from 'react';
import { Plus, RotateCcw, Search, RefreshCw, Zap, Trash2 } from 'lucide-react';
import type { ClipboardItem } from '../types';
import { ItemType, TaskStatus } from '../types';

interface ControlTowerProps {
  items: ClipboardItem[];
  isOwner: boolean;
  activeChannel: string;
  canPost: boolean;
  onNewEntry: () => void;
  onSearch: () => void;
  onRefresh: () => void;
  onResetVisibility?: () => void;
}

export const ControlTower: React.FC<ControlTowerProps> = ({
  items,
  isOwner,
  activeChannel,
  canPost,
  onNewEntry,
  onSearch,
  onRefresh,
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
          {canPost && (
            <div className="ct-action-row">
              <button className="ct-action-btn primary" onClick={onNewEntry}>
                <Plus size={12} />
                NEW ENTRY
              </button>
            </div>
          )}
          <div className="ct-action-row">
            <button className="ct-action-btn" onClick={onRefresh}>
              <RefreshCw size={12} />
              REFRESH SHEET
            </button>
            <button className="ct-action-btn" onClick={onSearch}>
              <Search size={12} />
              SEARCH
            </button>
          </div>
          <div className="ct-action-row">
            <button className="ct-action-btn" onClick={onRefresh}>
              <Zap size={12} />
              SYNC TO PIPELINE
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

      {/* System Metrics — owner only */}
      {isOwner && (
        <div className="ct-module">
          <div className="ct-module-header">
            <span className="ct-module-title">System Metrics</span>
          </div>
          <div className="ct-module-body">
            <div className="ct-metric-row">
              <span className="ct-metric-label">Queue Depth</span>
              <span className="ct-metric-value">{pending + events}</span>
            </div>
            <div className="ct-metric-row">
              <span className="ct-metric-label">Node Health</span>
              <span className="ct-metric-value ct-metric-ok">NOMINAL</span>
            </div>
            <div className="ct-metric-row">
              <span className="ct-metric-label">Uptime</span>
              <span className="ct-metric-value">99.9%</span>
            </div>
            <div className="ct-metric-divider" />
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
      )}
    </>
  );
};
