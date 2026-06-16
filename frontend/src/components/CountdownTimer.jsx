import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ expiryTime }) {
  const [remaining, setRemaining] = useState(() => computeRemaining(expiryTime));

  useEffect(() => {
    setRemaining(computeRemaining(expiryTime));

    const interval = setInterval(() => {
      const r = computeRemaining(expiryTime);
      setRemaining(r);
      if (r <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiryTime]);

  if (remaining <= 0) {
    return <span className="countdown-cell countdown-expired">Expired</span>;
  }

  return <span className="countdown-cell">{formatSeconds(remaining)}</span>;
}

function computeRemaining(expiryTime) {
  return Math.max(0, Math.floor((new Date(expiryTime).getTime() - Date.now()) / 1000));
}

function formatSeconds(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
