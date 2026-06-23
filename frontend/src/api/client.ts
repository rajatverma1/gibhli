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

export interface DropdownOption {
  value_code: string;
  display_name: string;
}

export interface CustomerAccount {
  id: string;
  account_number: string;
  account_name: string;
  currency: string;
  available_limit: number;
  account_type: string;
}

export const api = {
  // LC CRUD
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

  // Lookups
  searchBIC: (q: string) =>
    request<{ data: import('../types/lc').BICRecord[] }>(`/lookup/bic?q=${encodeURIComponent(q)}`),

  searchBeneficiaries: (q: string) =>
    request<{ data: import('../types/lc').BeneficiaryRecord[] }>(
      `/lookup/beneficiaries?q=${encodeURIComponent(q)}`
    ),

  getDropdown: (key: string) =>
    request<{ data: DropdownOption[] }>(`/lookup/dropdowns?key=${encodeURIComponent(key)}`),

  getAccounts: (companyId = 'HUL') =>
    request<{ data: CustomerAccount[] }>(`/lookup/accounts?company_id=${encodeURIComponent(companyId)}`),
};
