import type { Program } from '../../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:6942';

export async function fetchProgramsPaginated(params: {
  search?: string;
  countryId?: string;
  offset?: number;
  limit?: number;
  token?: string;
}): Promise<{ items: Program[]; total: number }> {
  const url = new URL(`${API_URL}/api/programs/paginated`);
  if (params.search) url.searchParams.set('search', params.search);
  if (params.countryId) url.searchParams.set('countryId', params.countryId);
  url.searchParams.set('offset', String(params.offset ?? 0));
  url.searchParams.set('limit', String(params.limit ?? 10));
  if (params.token) url.searchParams.set('current_url_token_request', params.token);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  const items = (await res.json()) as Program[];
  // No total from API; approximate using length + offset (best effort)
  return { items, total: (params.offset ?? 0) + items.length };
}
