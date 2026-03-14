import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ClipboardItem, ItemType } from '../types';
import { UserTab } from '../services/userRegistry';
import { getUserPresence } from '../services/db';
import { Send, Pin, Archive, StickyNote, AlertTriangle, MessageSquare, LayoutGrid, ListFilter, ChevronLeft, Trash2 } from 'lucide-react';

/* ─── Derived types (no DB changes — built from existing ClipboardItem[]) ─── */
interface DerivedChannel {
  userId: string;
  userName: string;
  unreadCount: number;
  isActive: boolean;
  isPinned: boolean;
  isFlagged: boolean;
  isArchived: boolean;
  lastMessage: string;
  lastMessageTime: number;
  status: 'ACTIVE NOW' | 'IDLE' | 'OFFLINE';
}

type CommsView = 'threads' | 'grid' | 'queue';

interface OwnerCommsHubProps {
  items: ClipboardItem[];
  currentUser: string;
  tabs: UserTab[];
  onSend: (userId: string, content: string) => void;
  onClearChat?: (userId: string) => void;
  onSwitchToUser: (userId: string) => void;
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export const OwnerCommsHub: React.FC<OwnerCommsHubProps> = ({
  items,
  currentUser,
  tabs,
  onSend,
  onClearChat,
  onSwitchToUser,
}) => {
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [view, setView] = useState<CommsView>('threads');
  const [draft, setDraft] = useState('');
  const [pinnedChannels, setPinnedChannels] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('jb3_pinned_channels') || '[]')); }
    catch { return new Set(); }
  });
  const [archivedChannels, setArchivedChannels] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('jb3_archived_channels') || '[]')); }
    catch { return new Set(); }
  });
  const [flaggedChannels, setFlaggedChannels] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('jb3_flagged_channels') || '[]')); }
    catch { return new Set(); }
  });
  const [channelNotes, setChannelNotes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('jb3_channel_notes') || '{}'); }
    catch { return {}; }
  });
  const [showNotesFor, setShowNotesFor] = useState<string | null>(null);
  const [presenceMap, setPresenceMap] = useState<Record<string, 'ACTIVE NOW' | 'IDLE' | 'OFFLINE'>>({});

  const endRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Persist actions
  useEffect(() => { localStorage.setItem('jb3_pinned_channels', JSON.stringify([...pinnedChannels])); }, [pinnedChannels]);
  useEffect(() => { localStorage.setItem('jb3_archived_channels', JSON.stringify([...archivedChannels])); }, [archivedChannels]);
  useEffect(() => { localStorage.setItem('jb3_flagged_channels', JSON.stringify([...flaggedChannels])); }, [flaggedChannels]);
  useEffect(() => { localStorage.setItem('jb3_channel_notes', JSON.stringify(channelNotes)); }, [channelNotes]);

  // Presence polling for all non-owner tabs
  useEffect(() => {
    const nonOwnerTabs = tabs.filter(t => !t.isOwner);
    const poll = async () => {
      const results: Record<string, 'ACTIVE NOW' | 'IDLE' | 'OFFLINE'> = {};
      for (const tab of nonOwnerTabs) {
        try {
          const data = await getUserPresence(tab.email);
          if (!data) { results[tab.id] = 'OFFLINE'; continue; }
          const age = Date.now() - data.timestamp;
          results[tab.id] = age < 60_000 ? 'ACTIVE NOW' : age < 300_000 ? 'IDLE' : 'OFFLINE';
        } catch { results[tab.id] = 'OFFLINE'; }
      }
      setPresenceMap(results);
    };
    poll();
    const interval = setInterval(poll, 15_000);
    return () => clearInterval(interval);
  }, [tabs]);

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length, activeChannel]);

  // Build derived channels from existing data
  const channels: DerivedChannel[] = useMemo(() => {
    const nonOwnerTabs = tabs.filter(t => !t.isOwner);
    return nonOwnerTabs.map(tab => {
      const chatItems = items.filter(i => i.type === ItemType.CHAT && i.syncTabId === tab.id);
      const sorted = [...chatItems].sort((a, b) => b.createdAt - a.createdAt);
      const latest = sorted[0];
      const unread = chatItems.filter(i => i.userId !== currentUser && !(i.readBy || []).includes(currentUser)).length;
      return {
        userId: tab.id,
        userName: tab.label,
        unreadCount: unread,
        isActive: presenceMap[tab.id] === 'ACTIVE NOW',
        isPinned: pinnedChannels.has(tab.id),
        isFlagged: flaggedChannels.has(tab.id),
        isArchived: archivedChannels.has(tab.id),
        lastMessage: latest?.content || '',
        lastMessageTime: latest?.createdAt || 0,
        status: presenceMap[tab.id] || 'OFFLINE',
      };
    }).sort((a, b) => {
      // Pinned first, then by last message time
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.lastMessageTime - a.lastMessageTime;
    });
  }, [items, tabs, currentUser, presenceMap, pinnedChannels, flaggedChannels, archivedChannels]);

  const activeChannelData = channels.find(c => c.userId === activeChannel);
  const activeMessages = useMemo(() => {
    if (!activeChannel) return [];
    return items
      .filter(i => i.type === ItemType.CHAT && i.syncTabId === activeChannel)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [items, activeChannel]);

  const activeCount = channels.filter(c => !c.isArchived).length;

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !activeChannel) return;
    onSend(activeChannel, text);
    setDraft('');
  };

  const togglePin = (userId: string) => {
    setPinnedChannels(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const toggleArchive = (userId: string) => {
    setArchivedChannels(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const toggleFlag = (userId: string) => {
    setFlaggedChannels(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  // Filter channels based on view mode
  const visibleChannels = useMemo(() => {
    if (view === 'queue') {
      return [...channels]
        .filter(c => !c.isArchived)
        .sort((a, b) => {
          // Flagged first, then unread, then by time
          if (a.isFlagged !== b.isFlagged) return a.isFlagged ? -1 : 1;
          if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
          return b.lastMessageTime - a.lastMessageTime;
        });
    }
    return channels.filter(c => !c.isArchived);
  }, [channels, view]);

  const formatTime = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const statusColor = (s: string) =>
    s === 'ACTIVE NOW' ? '#55ff88' : s === 'IDLE' ? '#ffd54f' : 'rgba(210,220,235,0.35)';

  /* ─── RENDER ─────────────────────────────────────────────────────────── */
  return (
    <div className="comms-hub">
      {/* ── Header ── */}
      <div className="comms-header">
        <div className="comms-header-left">
          <span className="comms-title">OS³ SECURE COMMS</span>
          <span className="comms-mode-badge">OWNER MODE</span>
        </div>
        <div className="comms-header-right">
          <span className="comms-active-chip">ACTIVE: {activeCount}</span>
        </div>
      </div>

      {/* ── Channel Tabs (horizontal swipeable) ── */}
      <div className="comms-channel-bar" ref={tabBarRef}>
        {visibleChannels.map(ch => (
          <button
            key={ch.userId}
            className={`comms-channel-tab ${activeChannel === ch.userId ? 'active' : ''} ${ch.isPinned ? 'pinned' : ''}`}
            onClick={() => { setActiveChannel(ch.userId); setView('threads'); }}
          >
            <span className="comms-channel-name">{ch.userName}</span>
            {ch.unreadCount > 0 && <span className="comms-unread-dot" />}
            {ch.isActive && <span className="comms-active-indicator" />}
          </button>
        ))}
        {channels.filter(c => c.isArchived).length > 0 && (
          <button
            className="comms-channel-tab comms-overflow"
            onClick={() => setView('grid')}
          >
            +{channels.filter(c => c.isArchived).length} archived
          </button>
        )}
      </div>

      {/* ── View Toggle ── */}
      <div className="comms-view-toggle">
        {(['threads', 'grid', 'queue'] as CommsView[]).map(v => (
          <button
            key={v}
            className={`comms-view-btn ${view === v ? 'active' : ''}`}
            onClick={() => setView(v)}
          >
            {v === 'threads' && <MessageSquare size={12} />}
            {v === 'grid' && <LayoutGrid size={12} />}
            {v === 'queue' && <ListFilter size={12} />}
            <span>{v.charAt(0).toUpperCase() + v.slice(1)}</span>
          </button>
        ))}
      </div>

      {/* ━━━━━ THREADS VIEW ━━━━━ */}
      {view === 'threads' && activeChannel && activeChannelData && (
        <>
          {/* Channel meta */}
          <div className="comms-channel-meta">
            <div className="comms-meta-row">
              <span className="comms-meta-label">SECURE CHANNEL: JONO ↔ {activeChannelData.userName}</span>
            </div>
            <div className="comms-meta-row comms-meta-sub">
              <span style={{ color: statusColor(activeChannelData.status) }}>● {activeChannelData.status}</span>
              <span>LAST: {formatTime(activeChannelData.lastMessageTime) || 'NEVER'}</span>
              <span>AES-256</span>
            </div>
          </div>

          {/* Messages */}
          <div className="comms-messages">
            {activeMessages.length === 0 && (
              <div className="comms-empty">No messages yet — start the conversation</div>
            )}
            {activeMessages.map(msg => {
              const isOwner = msg.userId === currentUser;
              const isSystem = msg.content.startsWith('[SYSTEM]');
              if (isSystem) {
                return (
                  <div key={msg.id} className="comms-system-event">
                    {msg.content.replace('[SYSTEM]', '').trim()}
                    <span className="comms-msg-time">{formatTime(msg.createdAt)}</span>
                  </div>
                );
              }
              return (
                <div key={msg.id} className={`comms-bubble ${isOwner ? 'comms-owner' : 'comms-user'}`}>
                  <div className="comms-bubble-meta">
                    {isOwner ? 'OWNER' : msg.userId.split('@')[0].toUpperCase()}
                    <span className="comms-msg-time">{formatTime(msg.createdAt)}</span>
                  </div>
                  <div className="comms-bubble-text">{msg.content}</div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div className="comms-composer">
            <input
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type secure response..."
              className="comms-input"
            />
            <button onClick={handleSend} disabled={!draft.trim()} className="comms-send-btn">
              <Send size={16} />
            </button>
          </div>

          {/* Action Dock */}
          <div className="comms-action-dock">
            <button
              className={`comms-dock-btn ${activeChannelData.isPinned ? 'active' : ''}`}
              onClick={() => togglePin(activeChannel)}
              title="Pin channel"
            >
              <Pin size={14} />
              <span>Pin</span>
            </button>
            <button
              className={`comms-dock-btn ${activeChannelData.isArchived ? 'active' : ''}`}
              onClick={() => toggleArchive(activeChannel)}
              title="Archive channel"
            >
              <Archive size={14} />
              <span>Archive</span>
            </button>
            <button
              className="comms-dock-btn"
              onClick={() => setShowNotesFor(showNotesFor === activeChannel ? null : activeChannel)}
              title="Channel notes"
            >
              <StickyNote size={14} />
              <span>Notes</span>
            </button>
            <button
              className={`comms-dock-btn ${activeChannelData.isFlagged ? 'active' : ''}`}
              onClick={() => toggleFlag(activeChannel)}
              title="Flag / Escalate"
            >
              <AlertTriangle size={14} />
              <span>Escalate</span>
            </button>
            {onClearChat && (
              <button
                className="comms-dock-btn comms-dock-danger"
                onClick={() => { if (confirm(`Clear all messages with ${activeChannelData.userName}?`)) onClearChat(activeChannel); }}
                title="Clear all messages"
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Notes panel */}
          {showNotesFor === activeChannel && (
            <div className="comms-notes-panel">
              <div className="comms-notes-header">
                <span>CHANNEL NOTES: {activeChannelData.userName}</span>
                <button onClick={() => setShowNotesFor(null)} className="comms-notes-close">×</button>
              </div>
              <textarea
                value={channelNotes[activeChannel] || ''}
                onChange={e => setChannelNotes(prev => ({ ...prev, [activeChannel]: e.target.value }))}
                placeholder="Private notes about this channel..."
                className="comms-notes-input"
                rows={4}
              />
            </div>
          )}
        </>
      )}

      {/* ━━━━━ THREADS VIEW — no channel selected ━━━━━ */}
      {view === 'threads' && !activeChannel && (
        <div className="comms-empty-state">
          <MessageSquare size={32} className="comms-empty-icon" />
          <p>Select a channel above to open conversation</p>
        </div>
      )}

      {/* ━━━━━ GRID VIEW ━━━━━ */}
      {view === 'grid' && (
        <div className="comms-grid">
          {channels.map(ch => (
            <button
              key={ch.userId}
              className={`comms-grid-card ${ch.isArchived ? 'archived' : ''}`}
              onClick={() => { setActiveChannel(ch.userId); setView('threads'); }}
            >
              <div className="comms-grid-card-top">
                <span className="comms-grid-name">{ch.userName}</span>
                <span className="comms-grid-status" style={{ color: statusColor(ch.status) }}>●</span>
              </div>
              <div className="comms-grid-preview">{ch.lastMessage || '—'}</div>
              <div className="comms-grid-card-bottom">
                <span className="comms-grid-time">{formatTime(ch.lastMessageTime)}</span>
                {ch.unreadCount > 0 && <span className="comms-grid-unread">{ch.unreadCount}</span>}
                {ch.isPinned && <Pin size={10} className="comms-grid-pin" />}
                {ch.isFlagged && <AlertTriangle size={10} className="comms-grid-flag" />}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ━━━━━ QUEUE VIEW ━━━━━ */}
      {view === 'queue' && (
        <div className="comms-queue">
          {visibleChannels.length === 0 && (
            <div className="comms-empty-state">
              <ListFilter size={32} className="comms-empty-icon" />
              <p>No unread or flagged channels</p>
            </div>
          )}
          {visibleChannels.map(ch => (
            <button
              key={ch.userId}
              className="comms-queue-row"
              onClick={() => { setActiveChannel(ch.userId); setView('threads'); }}
            >
              <div className="comms-queue-left">
                <span className="comms-queue-name">{ch.userName}</span>
                {ch.isFlagged && <span className="comms-queue-badge flagged">FLAGGED</span>}
                {ch.isPinned && <span className="comms-queue-badge pinned">PINNED</span>}
              </div>
              <div className="comms-queue-right">
                <span className="comms-queue-status" style={{ color: statusColor(ch.status) }}>● {ch.status}</span>
                {ch.unreadCount > 0 && <span className="comms-queue-unread">{ch.unreadCount} unread</span>}
                <span className="comms-queue-time">{formatTime(ch.lastMessageTime)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
