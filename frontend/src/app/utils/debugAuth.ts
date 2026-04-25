/**
 * Debug utility to check authentication status
 * Use this in browser console to verify auth is working
 */

import { auth } from '../firebase';

export async function debugAuth() {
  const user = auth.currentUser;
  
  if (!user) {
    console.log('❌ No user logged in');
    return {
      loggedIn: false,
      user: null,
      token: null
    };
  }
  
  const token = await user.getIdToken();
  
  console.log('✅ User logged in:');
  console.log('  UID:', user.uid);
  console.log('  Email:', user.email);
  console.log('  Display Name:', user.displayName);
  console.log('  Token (first 50 chars):', token.substring(0, 50) + '...');
  
  // Test API call
  try {
    const response = await fetch('/api/inventory', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('  API Test Response:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('  Items count:', data.items?.length || 0);
    }
  } catch (error) {
    console.error('  API Test Failed:', error);
  }
  
  return {
    loggedIn: true,
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    },
    token: token.substring(0, 50) + '...'
  };
}

// Make it available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
}
