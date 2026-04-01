import { apiFetch } from './client';
import type { AuthUser, LoginResponseData, RegisterResponseData } from './types';

export async function registerUser(username: string, password: string) {
  return apiFetch<RegisterResponseData>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function loginUser(username: string, password: string) {
  return apiFetch<LoginResponseData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function fetchMe(token: string) {
  return apiFetch<AuthUser>('/auth/me', {
    method: 'GET',
    token
  });
}
