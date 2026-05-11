/**
 * Authenticated API utility
 * Automatically attaches a fresh Firebase Auth ID token to every request.
 *
 * – Forces token refresh (forceRefresh=true) so we never send a stale token
 *   that would cause a 401 mid-session.
 * – Warns in the console when no Firebase user is present (e.g. legacy session)
 *   so auth issues are immediately visible during development.
 * – Throws on non-2xx responses so callers can catch errors instead of silently
 *   receiving malformed/empty data.
 */

import { auth } from '../firebase';

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;

  // Force-refresh the token every call to prevent mid-session 401s from
  // Firebase rotating keys or tokens expiring after 1 hour.
  let token: string | null = null;
  if (user) {
    try {
      token = await user.getIdToken(/* forceRefresh */ true);
    } catch (err) {
      console.warn('[auth] Failed to refresh Firebase token:', err);
    }
  } else {
    console.warn('[auth] No Firebase user found — request will be sent without Authorization header.');
  }

  const headers: Record<string, string> = {};

  // Merge any caller-supplied headers first
  if (options.headers) {
    const supplied = options.headers as Record<string, string>;
    Object.assign(headers, supplied);
  }

  // Only add Content-Type when the body is not FormData (let the browser set the multipart boundary)
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const BASE_URL = import.meta.env.PROD ? 'https://agentic-pharmacy.onrender.com' : '';
  const fetchUrl = url.startsWith('/api') ? `${BASE_URL}${url}` : url;
  
  const response = await fetch(fetchUrl, { ...options, headers });

  // Surface HTTP errors so callers can catch them rather than receiving
  // an unexpected JSON parse failure on the error-body.
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${body || response.statusText}`);
  }

  return response;
}
