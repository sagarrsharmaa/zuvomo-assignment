import React from 'react';
import SignalForm from './components/SignalForm';
import SignalTable from './components/SignalTable';
import { useSignals } from './hooks/useSignals';

export default function App() {
  const { signals, loading, error, removeSignal, refresh } = useSignals();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Trading Signal Tracker</h1>
        <p>Track live crypto trading signals with Binance price integration</p>
      </header>

      <div className="main-grid">
        <aside>
          <div className="card">
            <div className="card-title">
              <span className="icon">📡</span>
              New Signal
            </div>
            <SignalForm onCreated={refresh} />
          </div>
        </aside>

        <main>
          <div className="card">
            <div className="card-title">
              <span className="icon">📊</span>
              Signal Dashboard
            </div>
            <SignalTable
              signals={signals}
              loading={loading}
              error={error}
              onDelete={removeSignal}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
