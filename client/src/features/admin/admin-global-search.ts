export type AdminSearchInput = { query: string; limit: number };

const defaultLimit = 10;
const maximumLimit = 25;

export function normalizeAdminSearchInput(queryValue: string, limitValue: string): AdminSearchInput | null {
  const query = queryValue.trim();
  if (!query) return null;

  const limit = Number(limitValue);
  return { query, limit: Number.isInteger(limit) && limit >= 1 && limit <= maximumLimit ? limit : defaultLimit };
}

export function adminSearchPath(input: AdminSearchInput): string {
  const parameters = new URLSearchParams({ q: input.query, limit: String(input.limit) });
  return `/admin/search?${parameters}`;
}
