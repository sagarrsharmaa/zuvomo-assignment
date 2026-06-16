import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchSignals } from '../api/signals';

const POLL_INTERVAL = 15000;

export function useSignals(statusFilter = null) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchSignals(statusFilter);
      setSignals(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch signals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [load]);

  const removeSignal = useCallback((id) => {
    setSignals((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  return { signals, loading, error, removeSignal, refresh };
}
