import React, { useState } from 'react';
import { deleteSignal } from '../api/signals';
import StatusBadge from './StatusBadge';
import CountdownTimer from './CountdownTimer';

export default function SignalTable({ signals, loading, error, onDelete }) {
  const [filter, setFilter] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const filtered = filter ? signals.filter((s) => s.status === filter) : signals;

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await deleteSignal(id);
      onDelete(id);
    } catch (err) {
      console.error('Failed to delete signal:', err);
      alert('Failed to delete signal');
    } finally {
      setDeletingId(null);
    }
  }

  function formatRoi(value) {
    if (value === null || value === undefined) return '—';
    return `${Number(value).toFixed(2)}%`;
  }

  function roiClass(value) {
    if (value === null || value === undefined) return '';
    if (value > 0) return 'roi-positive';
    if (value < 0) return 'roi-negative';
    return 'roi-zero';
  }

  function formatPrice(price) {
    if (price === null || price === undefined) return '—';
    const num = Number(price);
    if (num >= 1) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="icon">⏳</div>
        <h3>Loading signals…</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        ⚠ {error}
      </div>
    );
  }

  const statusCounts = {
    ALL: signals.length,
    OPEN: signals.filter((s) => s.status === 'OPEN').length,
    TARGET_HIT: signals.filter((s) => s.status === 'TARGET_HIT').length,
    STOPLOSS_HIT: signals.filter((s) => s.status === 'STOPLOSS_HIT').length,
    EXPIRED: signals.filter((s) => s.status === 'EXPIRED').length,
  };

  return (
    <div>
      <div className="table-header">
        <div className="filter-group">
          <button
            className={`filter-btn ${filter === null ? 'active' : ''}`}
            onClick={() => setFilter(null)}
            id="filter-all"
          >
            All ({statusCounts.ALL})
          </button>
          <button
            className={`filter-btn ${filter === 'OPEN' ? 'active' : ''}`}
            onClick={() => setFilter('OPEN')}
            id="filter-open"
          >
            Open ({statusCounts.OPEN})
          </button>
          <button
            className={`filter-btn ${filter === 'TARGET_HIT' ? 'active' : ''}`}
            onClick={() => setFilter('TARGET_HIT')}
            id="filter-target-hit"
          >
            Target ({statusCounts.TARGET_HIT})
          </button>
          <button
            className={`filter-btn ${filter === 'STOPLOSS_HIT' ? 'active' : ''}`}
            onClick={() => setFilter('STOPLOSS_HIT')}
            id="filter-stoploss"
          >
            Stop Loss ({statusCounts.STOPLOSS_HIT})
          </button>
          <button
            className={`filter-btn ${filter === 'EXPIRED' ? 'active' : ''}`}
            onClick={() => setFilter('EXPIRED')}
            id="filter-expired"
          >
            Expired ({statusCounts.EXPIRED})
          </button>
        </div>
        <span className="signal-count">
          {filtered.length} signal{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📊</div>
          <h3>No signals found</h3>
          <p>Create your first trading signal using the form.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="signal-table" id="signal-dashboard-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Direction</th>
                <th>Entry Price</th>
                <th>Target</th>
                <th>Stop Loss</th>
                <th>Current Price</th>
                <th>Status</th>
                <th>ROI %</th>
                <th>Time Remaining</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((signal) => {
                const roi =
                  signal.status === 'OPEN' ? signal.unrealizedRoi : signal.realizedRoi;

                return (
                  <tr key={signal.id} id={`signal-row-${signal.id}`}>
                    <td className="symbol-cell">{signal.symbol}</td>
                    <td>
                      <span className={signal.direction === 'BUY' ? 'direction-buy' : 'direction-sell'}>
                        {signal.direction}
                      </span>
                    </td>
                    <td className="price-cell">{formatPrice(signal.entryPrice)}</td>
                    <td className="price-cell">{formatPrice(signal.targetPrice)}</td>
                    <td className="price-cell">{formatPrice(signal.stopLoss)}</td>
                    <td className="price-cell">{formatPrice(signal.currentPrice)}</td>
                    <td>
                      <StatusBadge status={signal.status} />
                    </td>
                    <td className={roiClass(roi)}>{formatRoi(roi)}</td>
                    <td>
                      <CountdownTimer expiryTime={signal.expiryTime} />
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(signal.id)}
                        disabled={deletingId === signal.id}
                        id={`btn-delete-${signal.id}`}
                      >
                        {deletingId === signal.id ? '…' : '✕'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
