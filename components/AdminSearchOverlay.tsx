import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

export interface TabUser {
  id: string;
  label: string;
  email: string;
  isOwner?: boolean;
}

interface AdminSearchOverlayProps {
  users: TabUser[];
  activeTabId: string;
  onSelect: (user: TabUser) => void;
  onClose: () => void;
}

const AdminSearchOverlay: React.FC<AdminSearchOverlayProps> = ({ users, activeTabId, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = users.filter(u => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return u.id.toLowerCase().includes(q) || u.label.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="admin-search-overlay" onClick={onClose}>
      <div className="admin-search-panel" onClick={e => e.stopPropagation()}>
        <div className="admin-search-header">
          <Search size={16} className="text-accent" />
          <input
            autoFocus
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search users..."
            className="admin-search-input"
          />
          <button onClick={onClose} className="text-muted/40 hover:text-primary transition-colors"><X size={16} /></button>
        </div>
        <div className="admin-search-results">
          {filtered.map(t => (
            <button
              key={t.id}
              className={`admin-search-item ${activeTabId === t.id ? 'active' : ''}`}
              onClick={() => { onSelect(t); onClose(); }}
            >
              <span className="admin-search-label">{t.label}</span>
              <span className="admin-search-email">{t.email}</span>
              {t.isOwner && <span className="admin-search-badge">OWNER</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="no-results">NO USERS FOUND</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSearchOverlay;
