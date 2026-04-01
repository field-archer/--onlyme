import { ref, computed } from 'vue';
import * as authApi from '../api/auth';
import type { AuthUser } from '../api/types';

const TOKEN_KEY = 'forestfire_token';
const USER_KEY = 'forestfire_user';

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
const user = ref<AuthUser | null>(readStoredUser());

export function useAuth() {
  const isLoggedIn = computed(() => Boolean(token.value));

  function setSession(accessToken: string, u: AuthUser) {
    token.value = accessToken;
    user.value = u;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }

  function clearSession() {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function login(username: string, password: string) {
    const data = await authApi.loginUser(username, password);
    setSession(data.access_token, data.user);
  }

  async function register(username: string, password: string) {
    await authApi.registerUser(username, password);
  }

  async function refreshMe() {
    if (!token.value) return;
    try {
      const me = await authApi.fetchMe(token.value);
      user.value = me;
      localStorage.setItem(USER_KEY, JSON.stringify(me));
    } catch {
      clearSession();
    }
  }

  function logout() {
    clearSession();
  }

  return {
    token,
    user,
    isLoggedIn,
    login,
    register,
    logout,
    refreshMe,
    clearSession
  };
}
