/**
 * Authenticated API utility
 * Automatically attaches Firebase Auth token to all API requests
 */

import { auth } from '../firebase';

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  
  const headers: HeadersInit = {
    ...options.headers,
  };
  
  // Only add Content-Type if not already set and body is not FormData
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add Authorization header if user is authenticated
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, { ...options, headers });
}
