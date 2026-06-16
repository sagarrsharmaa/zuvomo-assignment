import React from 'react';

const STATUS_CONFIG = {
  OPEN: { label: 'Open', className: 'open' },
  TARGET_HIT: { label: 'Target Hit', className: 'target-hit' },
  STOPLOSS_HIT: { label: 'Stop Loss Hit', className: 'stoploss-hit' },
  EXPIRED: { label: 'Expired', className: 'expired' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'open' };

  return (
    <span className={`status-badge ${config.className}`}>
      <span className="status-dot"></span>
      {config.label}
    </span>
  );
}
