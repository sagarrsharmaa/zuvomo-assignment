import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

export async function createSignal(signalData) {
  const { data } = await api.post('/signals', signalData);
  return data;
}

export async function fetchSignals(status = null) {
  const params = {};
  if (status) params.status = status;
  const { data } = await api.get('/signals', { params });
  return data;
}

export async function fetchSignalById(id) {
  const { data } = await api.get(`/signals/${id}`);
  return data;
}

export async function deleteSignal(id) {
  await api.delete(`/signals/${id}`);
}

export async function fetchSignalStatus(id) {
  const { data } = await api.get(`/signals/${id}/status`);
  return data;
}
