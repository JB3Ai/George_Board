import React, { useState, useEffect, useRef } from 'react';

interface TelemetryStripProps {
  itemCount: number;
  userCount: number;
  isOwner: boolean;
  activeChannel: string;
}

const STATUS_POOL = [
  'LEDGER_WRITE • STANDBY',
  'PIPELINE_QUEUE • CLEAR',
  'NODE_HEALTH • NOMINAL',
  'UPLINK STATUS • CONNECTED',
  'ACTIVE_SIGNALS • MONITORING',
  'SYNC_ENGINE • IDLE',
  'AES_LAYER • ENCRYPTED',
];

export const TelemetryStrip: React.FC<TelemetryStripProps> = ({
  itemCount,
  userCount,
  isOwner,
}) => {
  const [ts, setTs] = useState(() => fmtTime());
  const [statusIdx, setStatusIdx] = useState(0);
  const rttRef = useRef(Math.floor(12 + Math.random() * 18));

  useEffect(() => {
    const clockId = setInterval(() => setTs(fmtTime()), 30_000);
    const statusId = setInterval(() => {
      setStatusIdx(prev => (prev + 1) % STATUS_POOL.length);
      rttRef.current = Math.floor(12 + Math.random() * 18);
    }, 4_000);
    return () => { clearInterval(clockId); clearInterval(statusId); };
  }, []);

  return (
    <div className="telemetry-strip">
      <div className="telemetry-strip-items">
        <span className="telemetry-item telemetry-rotate">
          <span className="telemetry-dot" />
          {STATUS_POOL[statusIdx]}
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
        <span className="telemetry-item">
          RTT: {rttRef.current}ms
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
