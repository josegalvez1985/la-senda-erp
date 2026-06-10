import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type User = { name: string; username: string };

type AuthCtx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  applySession: (session: { user: User; token: string }) => void;
  logout: () => void;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const STORAGE_KEY = '@lasenda/user';
const TOKEN_KEY = '@lasenda/token';
const LOGIN_URL = 'https://oracleapex.com/ords/lasenda/auth/login';
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const t = localStorage.getItem(TOKEN_KEY);
    if (raw && t) {
      setUser(JSON.parse(raw));
      setToken(t);
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return false;

      const data = await res.json();
      // El endpoint envuelve la respuesta en `resultado` como string JSON
      const inner = typeof data.resultado === 'string' ? JSON.parse(data.resultado) : data.resultado ?? data;
      if (String(inner?.ok) !== 'true' || !inner?.token) return false;

      const u: User = { name: inner.nombre ?? inner.username ?? username, username: inner.username ?? username };
      setUser(u);
      setToken(inner.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      localStorage.setItem(TOKEN_KEY, inner.token);
      return true;
    } catch {
      return false;
    }
  };

  const applySession = (session: { user: User; token: string }) => {
    setUser(session.user);
    setToken(session.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session.user));
    localStorage.setItem(TOKEN_KEY, session.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  // fetch que adjunta el token y cierra sesión si el backend responde 401
  const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (token) headers.set('X-Token', token);
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401) logout();
    return res;
  };

  return <Ctx.Provider value={{ user, token, loading, login, applySession, logout, authFetch }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fuera de AuthProvider');
  return c;
};
