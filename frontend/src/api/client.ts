const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  createLC: () =>
    request<{ data: import('../types/lc').LCApplication }>('/lc', { method: 'POST' }),

  getLC: (id: string) =>
    request<{ data: import('../types/lc').LCApplication }>(`/lc/${id}`),

  listLC: () =>
    request<{ data: import('../types/lc').LCApplication[] }>('/lc'),

  saveStep: (id: string, step: 1 | 2 | 3, data: unknown) =>
    request<{ data: import('../types/lc').LCApplication }>(`/lc/${id}/step/${step}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  runMismatch: (id: string) =>
    request<{ data: import('../types/lc').LCApplication['step4'] }>(`/lc/${id}/run-mismatch`, {
      method: 'POST',
    }),

  resolveMismatch: (
    id: string,
    index: number,
    resolution: import('../types/lc').MismatchResolution
  ) =>
    request<{ data: import('../types/lc').LCApplication['step4'] }>(
      `/lc/${id}/mismatch/${index}`,
      { method: 'PATCH', body: JSON.stringify(resolution) }
    ),

  submitLC: (id: string) =>
    request<{ data: import('../types/lc').LCApplication }>(`/lc/${id}/submit`, {
      method: 'POST',
    }),

  getMT700: (id: string) =>
    fetch(`${BASE}/lc/${id}/mt700`).then(r => r.text()),

  searchBIC: (q: string) =>
    request<{ data: import('../types/lc').BICRecord[] }>(`/lookup/bic?q=${encodeURIComponent(q)}`),

  searchBeneficiaries: (q: string) =>
    request<{ data: import('../types/lc').BeneficiaryRecord[] }>(
      `/lookup/beneficiaries?q=${encodeURIComponent(q)}`
    ),
};
