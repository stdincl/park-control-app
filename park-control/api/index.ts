const API_BASE = __DEV__
  ? 'http://127.0.0.1:8001'
  : 'https://parkcontrol.api.stdin.cl';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

let authToken: string | null = null;

export function setToken(token: string | null): void {
  authToken = token;
}

async function request<T>(method: Method, path: string, body?: object): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Error en la solicitud');
  }

  return data as T;
}

const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{token: string; user: any}>('POST', '/api/auth/login', {email, password}),

  register: (name: string, email: string, password: string, passwordConfirmation: string) =>
    request<{token: string; user: any}>('POST', '/api/auth/register', {
      name, email, password, password_confirmation: passwordConfirmation,
    }),

  loginWithGoogle: (googleToken: string) =>
    request<{token: string; user: any}>('POST', '/api/auth/login/google', {google_token: googleToken}),

  loginWithApple: (appleToken: string, name?: string, email?: string) =>
    request<{token: string; user: any}>('POST', '/api/auth/login/apple', {apple_token: appleToken, name, email}),

  forgotPassword: (email: string) =>
    request<{message: string}>('POST', '/api/auth/forgot-password', {email}),

  logout: () => request<{message: string}>('POST', '/api/auth/logout'),

  me: () => request<{user: any}>('GET', '/api/auth/me'),

  // Owner
  getMyCommunities: () =>
    request<{communities: any[]}>('GET', '/api/owner/communities'),

  searchCommunities: (comune: string, name?: string) =>
    request<{communities: any[]}>('POST', '/api/owner/communities/search', {comune, name}),

  joinCommunity: (communityIdentifier: number, code: string) =>
    request<{message: string; community: any}>('POST', '/api/owner/communities/join', {
      community_identifier: communityIdentifier, code,
    }),

  getCommunityVehicles: (id: number) =>
    request<{community: any; availability: any; vehicles: any[]}>('GET', `/api/owner/communities/${id}/vehicles`),

  setHomeCommunity: (id: number) =>
    request<{message: string}>('POST', `/api/owner/communities/${id}/home`),

  leaveCommunity: (id: number) =>
    request<{message: string}>('DELETE', `/api/owner/communities/${id}`),

  // Plans
  getPlans: () => request<{plans: any[]}>('GET', '/api/plans'),
};

export default api;
