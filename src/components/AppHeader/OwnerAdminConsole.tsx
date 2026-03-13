import React from 'react';
import { MessageSquare, Settings as GearIcon, Pencil, Trash2, Plus } from 'lucide-react';

/* ─── Types ─── */

/** Single tab slot in the Owner Admin Console */

export interface AdminTab {
  id: string;          // HOME | TAB2 | TAB3 | TAB4 | CHAT | CONFIG
  label: string;
  fixed: boolean;      // HOME, CHAT, CONFIG are fixed
}

export interface OwnerAdminConsoleProps {
  selectedUser: string;
  userStatus?: 'ACTIVE NOW' | 'IDLE' | 'OFFLINE';
  lastSeen?: string;
  adminProjectTabs: AdminTab[];
  activeAdminTab: string;
  onAdminTabChange: (tabId: string) => void;
  onRenameTab?: (tabId: string) => void;
  onDeleteTab?: (tabId: string) => void;
  onAddTab?: () => void;
}

/* ─── Status dot color ─── */

const statusColor: Record<string, string> = {
  'ACTIVE NOW': '#22c55e',
  IDLE: '#eab308',
  OFFLINE: '#6b7280',
};

/* ─── Component ─── */

export const OwnerAdminConsole: React.FC<OwnerAdminConsoleProps> = ({
  selectedUser,
  userStatus = 'OFFLINE',
  lastSeen,
  adminProjectTabs,
  activeAdminTab,
  onAdminTabChange,
  onRenameTab,
  onDeleteTab,
  onAddTab,
}) => {
  /* Enforce 6-slot order: HOME → TAB2 → TAB3 → TAB4 → CHAT → CONFIG */
  const home = adminProjectTabs.find((t) => t.id === 'HOME');
  const chat = adminProjectTabs.find((t) => t.id === 'CHAT');
  const config = adminProjectTabs.find((t) => t.id === 'CONFIG');
  const editable = adminProjectTabs.filter(
    (t) => t.id !== 'HOME' && t.id !== 'CHAT' && t.id !== 'CONFIG',
  );
  const ordered = [home, ...editable, chat, config].filter(Boolean) as AdminTab[];

  const editableCount = editable.length;
  const canAddMore = editableCount < 3;

  return (
    <div className="owner-admin-console">
      {/* ── User info row ── */}
      <div className="oac-user-row">
        <div className="oac-user-identity">
          <span
            className="oac-status-dot"
            style={{ background: statusColor[userStatus] ?? statusColor.OFFLINE }}
          />
          <span className="oac-user-name">{selectedUser}</span>
          <span className="oac-user-status">{userStatus}</span>
        </div>
        <div className="oac-meta">
          <span>LAST SEEN: {lastSeen ?? 'N/A'}</span>
          <span>1:1 SYNC: SECURE AES-256</span>
        </div>
      </div>

      {/* ── Tab row (exactly 6 slots) ── */}
      <div className="oac-tab-row">
        {ordered.map((tab) => {
          const isActive = activeAdminTab === tab.id;
          const isEditable = !tab.fixed;
          const icon =
            tab.id === 'CHAT' ? <MessageSquare size={11} className="mr-1 opacity-60" /> :
            tab.id === 'CONFIG' ? <GearIcon size={11} className="mr-1 opacity-60" /> :
            null;

          return (
            <div key={tab.id} className={`oac-tab ${isActive ? 'oac-tab--active' : ''}`}>
              <button
                className="oac-tab-label"
                onClick={() => onAdminTabChange(tab.id)}
              >
                {icon}
                {tab.label}
              </button>
              {isEditable && (
                <span className="oac-tab-actions">
                  {onRenameTab && (
                    <button
                      className="oac-tab-action"
                      onClick={() => onRenameTab(tab.id)}
                      title={`Rename ${tab.label}`}
                    >
                      <Pencil size={10} />
                    </button>
                  )}
                  {onDeleteTab && (
                    <button
                      className="oac-tab-action oac-tab-action--danger"
                      onClick={() => onDeleteTab(tab.id)}
                      title={`Remove ${tab.label}`}
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </span>
              )}
            </div>
          );
        })}

        {/* Add tab button when < 3 editable tabs */}
        {canAddMore && onAddTab && (
          <button className="oac-tab oac-tab-add" onClick={onAddTab} title="Add project tab">
            <Plus size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
