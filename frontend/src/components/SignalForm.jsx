import React, { useState } from 'react';
import { createSignal } from '../api/signals';

const INITIAL_FORM = {
  symbol: '',
  direction: 'BUY',
  entryPrice: '',
  stopLoss: '',
  targetPrice: '',
  entryTime: '',
  expiryTime: '',
};

export default function SignalForm({ onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setServerError('');
    setSuccess(false);
  }

  function validateForm() {
    const errors = {};
    const { symbol, direction, entryPrice, stopLoss, targetPrice, entryTime, expiryTime } = form;

    if (!symbol || !symbol.trim()) {
      errors.symbol = 'Symbol is required';
    }

    if (!['BUY', 'SELL'].includes(direction)) {
      errors.direction = 'Direction must be BUY or SELL';
    }

    const ep = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(targetPrice);

    if (!entryPrice || isNaN(ep) || ep <= 0) {
      errors.entryPrice = 'Entry price must be a positive number';
    }
    if (!stopLoss || isNaN(sl) || sl <= 0) {
      errors.stopLoss = 'Stop loss must be a positive number';
    }
    if (!targetPrice || isNaN(tp) || tp <= 0) {
      errors.targetPrice = 'Target price must be a positive number';
    }

    if (!errors.entryPrice && !errors.stopLoss && !errors.targetPrice) {
      if (direction === 'BUY') {
        if (sl >= ep) errors.stopLoss = 'For BUY signals, stop loss must be less than entry price';
        if (tp <= ep) errors.targetPrice = 'For BUY signals, target price must be greater than entry price';
      } else if (direction === 'SELL') {
        if (sl <= ep) errors.stopLoss = 'For SELL signals, stop loss must be greater than entry price';
        if (tp >= ep) errors.targetPrice = 'For SELL signals, target price must be less than entry price';
      }
    }

    if (!entryTime) {
      errors.entryTime = 'Entry time is required';
    } else {
      const entryDate = new Date(entryTime);
      if (isNaN(entryDate.getTime())) {
        errors.entryTime = 'Entry time must be a valid date';
      } else {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        if (entryDate < twentyFourHoursAgo) {
          errors.entryTime = 'Entry time must not be more than 24 hours in the past';
        }
      }
    }

    if (!expiryTime) {
      errors.expiryTime = 'Expiry time is required';
    } else if (entryTime) {
      const entryDate = new Date(entryTime);
      const expiryDate = new Date(expiryTime);
      if (isNaN(expiryDate.getTime())) {
        errors.expiryTime = 'Expiry time must be a valid date';
      } else if (expiryDate <= entryDate) {
        errors.expiryTime = 'Expiry time must be after entry time';
      }
    }

    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    setSuccess(false);

    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        symbol: form.symbol.trim(),
        direction: form.direction,
        entryPrice: parseFloat(form.entryPrice),
        stopLoss: parseFloat(form.stopLoss),
        targetPrice: parseFloat(form.targetPrice),
        entryTime: new Date(form.entryTime).toISOString(),
        expiryTime: new Date(form.expiryTime).toISOString(),
      };

      await createSignal(payload);
      setForm(INITIAL_FORM);
      setFieldErrors({});
      setSuccess(true);
      if (onCreated) onCreated();
    } catch (err) {
      const msg =
        err.response?.data?.error || 'An unexpected error occurred. Please try again.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate id="signal-form">
      {serverError && (
        <div className="alert alert-error" id="form-server-error">
          ⚠ {serverError}
        </div>
      )}
      {success && (
        <div className="alert alert-success" id="form-success">
          ✓ Signal created successfully!
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="input-symbol">Symbol</label>
        <input
          id="input-symbol"
          className={`form-input ${fieldErrors.symbol ? 'error' : ''}`}
          type="text"
          name="symbol"
          placeholder="e.g. BTCUSDT"
          value={form.symbol}
          onChange={handleChange}
        />
        {fieldErrors.symbol && <div className="field-error">{fieldErrors.symbol}</div>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="input-direction">Direction</label>
        <select
          id="input-direction"
          className={`form-select ${fieldErrors.direction ? 'error' : ''}`}
          name="direction"
          value={form.direction}
          onChange={handleChange}
        >
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
        {fieldErrors.direction && <div className="field-error">{fieldErrors.direction}</div>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="input-entryPrice">Entry Price</label>
        <input
          id="input-entryPrice"
          className={`form-input ${fieldErrors.entryPrice ? 'error' : ''}`}
          type="number"
          name="entryPrice"
          step="any"
          min="0"
          placeholder="0.00"
          value={form.entryPrice}
          onChange={handleChange}
        />
        {fieldErrors.entryPrice && <div className="field-error">{fieldErrors.entryPrice}</div>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="input-stopLoss">Stop Loss</label>
          <input
            id="input-stopLoss"
            className={`form-input ${fieldErrors.stopLoss ? 'error' : ''}`}
            type="number"
            name="stopLoss"
            step="any"
            min="0"
            placeholder="0.00"
            value={form.stopLoss}
            onChange={handleChange}
          />
          {fieldErrors.stopLoss && <div className="field-error">{fieldErrors.stopLoss}</div>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="input-targetPrice">Target Price</label>
          <input
            id="input-targetPrice"
            className={`form-input ${fieldErrors.targetPrice ? 'error' : ''}`}
            type="number"
            name="targetPrice"
            step="any"
            min="0"
            placeholder="0.00"
            value={form.targetPrice}
            onChange={handleChange}
          />
          {fieldErrors.targetPrice && <div className="field-error">{fieldErrors.targetPrice}</div>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="input-entryTime">Entry Time</label>
          <input
            id="input-entryTime"
            className={`form-input ${fieldErrors.entryTime ? 'error' : ''}`}
            type="datetime-local"
            name="entryTime"
            value={form.entryTime}
            onChange={handleChange}
          />
          {fieldErrors.entryTime && <div className="field-error">{fieldErrors.entryTime}</div>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="input-expiryTime">Expiry Time</label>
          <input
            id="input-expiryTime"
            className={`form-input ${fieldErrors.expiryTime ? 'error' : ''}`}
            type="datetime-local"
            name="expiryTime"
            value={form.expiryTime}
            onChange={handleChange}
          />
          {fieldErrors.expiryTime && <div className="field-error">{fieldErrors.expiryTime}</div>}
        </div>
      </div>

      <button
        className="btn btn-primary"
        type="submit"
        disabled={submitting}
        id="btn-create-signal"
      >
        {submitting ? 'Creating…' : '+ Create Signal'}
      </button>
    </form>
  );
}
