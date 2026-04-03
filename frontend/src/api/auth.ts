/** First-party auth: login/register against the API; JWT stored in sessionStorage. */

const TOKEN_KEY = 'carecost_access_token';

const base = () => (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') || '';

export function getStoredToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export type TokenResponse = {
  access_token: string;
  token_type: string;
  sub: string;
  email: string | null;
};

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { detail?: unknown };
    if (typeof j.detail === 'string') return j.detail;
    return res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function loginApi(email: string, password: string): Promise<TokenResponse> {
  const url = `${base()}/api/auth/login`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<TokenResponse>;
}

export async function registerApi(email: string, password: string): Promise<TokenResponse> {
  const url = `${base()}/api/auth/register`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<TokenResponse>;
}
