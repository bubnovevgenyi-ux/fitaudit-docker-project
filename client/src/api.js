import { readJson } from './format.js';

async function request(url, options) {
  const response = await fetch(url, options);
  return readJson(response);
}

export function listDishes() {
  return request('/api/dishes');
}

export function createDish(payload) {
  return request('/api/dishes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateDish(id, payload) {
  return request(`/api/dishes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteDish(id) {
  return request(`/api/dishes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function fetchCatalog({ query = '', limit = 20, skip = 0 } = {}) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  params.set('limit', String(limit));
  params.set('skip', String(skip));
  return request(`/api/catalog?${params.toString()}`);
}
