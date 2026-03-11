import React, { useState, useEffect } from 'react';

interface TelemetryStripProps {
  itemCount: number;
  userCount: number;
  isOwner: boolean;
  activeChannel: string;
}

export const TelemetryStrip: React.FC<TelemetryStripProps> = ({
  itemCount,
  userCount,
  isOwner,
  activeChannel,
}) => {
  const [ts, setTs] = useState(() => fmtTime());

  useEffect(() => {
    const id = setInterval(() => setTs(fmtTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="telemetry-strip">
      <div className="telemetry-strip-items">
        <span className="telemetry-item">
          <span className="telemetry-dot" />
          LEDGER_WRITE
        </span>
        <span className="telemetry-item">
          <span className="telemetry-dot" />
          PIPELINE_QUEUE
        </span>
        <span className="telemetry-item">
          <span className="telemetry-dot" />
          NODE_HEALTH
        </span>
        {isOwner && (
          <span className="telemetry-item">
            <span className="telemetry-dot" />
            CHANNELS: {userCount}
          </span>
        )}
        <span className="telemetry-item">
          RECORDS: {itemCount}
        </span>
      </div>
      <span className="telemetry-ts">{ts}</span>
    </div>
  );
};

function fmtTime(): string {
  const d = new Date();
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    + ' UTC' + (d.getTimezoneOffset() <= 0 ? '+' : '') + String(-d.getTimezoneOffset() / 60);
}
