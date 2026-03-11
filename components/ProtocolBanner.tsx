import React from 'react';

interface ProtocolBannerProps {
  protocolId: string;
  title: string;
  stats?: { value: string | number; label: string }[];
  contextLabel?: string;
}

export const ProtocolBanner: React.FC<ProtocolBannerProps> = ({
  protocolId,
  title,
  stats,
  contextLabel,
}) => (
  <div className="protocol-banner">
    <div className="protocol-banner-left">
      <span className="protocol-id">{protocolId}</span>
      <span className="protocol-title">{title}</span>
    </div>
    <div className="protocol-banner-right">
      {stats && stats.length > 0 && stats.map((s, i) => (
        <div key={i} className="protocol-stat">
          <span className="protocol-stat-value">{s.value}</span>
          <span className="protocol-stat-label">{s.label}</span>
        </div>
      ))}
      {contextLabel && (
        <div className="protocol-context-chip">{contextLabel}</div>
      )}
    </div>
  </div>
);
