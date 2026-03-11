import React, { useMemo } from 'react';
import type { ClipboardItem } from '../types';

interface ActivityTickerProps {
  items: ClipboardItem[];
  maxItems?: number;
}

export const ActivityTicker: React.FC<ActivityTickerProps> = ({ items, maxItems = 5 }) => {
  const recent = useMemo(() => {
    return [...items]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maxItems)
      .map(i => ({
        id: i.id,
        label: `${i.type.toUpperCase()}: ${(i.title || i.content || '').slice(0, 32)}${(i.title || i.content || '').length > 32 ? '…' : ''}`,
        ts: fmtAgo(i.createdAt),
      }));
  }, [items, maxItems]);

  if (recent.length === 0) return null;

  return (
    <div className="activity-ticker">
      <span className="activity-ticker-label">LIVE</span>
      <div className="activity-ticker-track">
        {recent.map(r => (
          <span key={r.id} className="activity-ticker-item">
            {r.label} <span className="activity-ticker-ts">{r.ts}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

function fmtAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
