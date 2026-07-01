// api.js — all communication with the backend goes through this file.
//
// VITE_API_URL:
//   Local dev  → not set, falls back to '' so Vite's proxy handles /api/*
//   Production → set to your Render backend URL, e.g. https://timers-api.onrender.com

const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

async function request(path, options) {
  const res = await fetch(BASE + path, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export const getPublicKey = () =>
  request('/subscriptions/public-key').then((d) => d.publicKey);

export const saveSubscription = (subscription) =>
  request('/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

export const getTimers = () => request('/timers');

export const createTimer = (body) =>
  request('/timers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const modifyTimer = (id, adjustSeconds) =>
  request(`/timers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adjustSeconds }),
  });

export const deleteTimer = (id) =>
  request(`/timers/${id}`, { method: 'DELETE' });

// ── Records ──────────────────────────────────────────────────────────────

export const getRecords = () => request('/records');

export const createRecord = (body) =>
  request('/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const updateRecord = (id, body) =>
  request(`/records/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const deleteRecord = (id) =>
  request(`/records/${id}`, { method: 'DELETE' });

export const clearRecords = () =>
  request('/records', { method: 'DELETE' });

// ── Record Columns ───────────────────────────────────────────────────────

export const getRecordColumns = () => request('/record-columns');

export const saveRecordColumns = (columns) =>
  request('/record-columns', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(columns),
  });
