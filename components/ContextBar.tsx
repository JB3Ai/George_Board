import React from 'react';

interface ContextBarProps {
  tag: string;
  source: string;
  right?: React.ReactNode;
}

export const ContextBar: React.FC<ContextBarProps> = ({ tag, source, right }) => (
  <div className="context-bar">
    <div className="context-bar-left">
      <span className="context-bar-tag">{tag}</span>
      <span className="context-bar-source">{source}</span>
    </div>
    {right && <div>{right}</div>}
  </div>
);
