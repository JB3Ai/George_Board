import React from 'react';

interface ConsoleGridProps {
  children: React.ReactNode;
  controlTower?: React.ReactNode;
}

export const ConsoleGrid: React.FC<ConsoleGridProps> = ({ children, controlTower }) => (
  <div className="console-grid">
    <div className="console-data-engine">
      {children}
    </div>
    {controlTower && (
      <div className="console-control-tower">
        {controlTower}
      </div>
    )}
  </div>
);
