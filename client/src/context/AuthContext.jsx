import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import authService from '../services/authService.js';
import { onUnauthorized } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous
  const mounted = useRef(true);

  const applySession = useCallback((payload) => {
    if (payload?.user) {
      setUser(payload.user);
      setStats(payload.stats ?? null);
      setStatus('authenticated');
    } else {
      setUser(null);
      setStats(null);
      setStatus('anonymous');
    }
  }, []);

  /** Load the current session (called on boot and after auth changes). */
  const refresh = useCallback(async () => {
    try {
      const { data } = await authService.me();
      if (!mounted.current) return null;
      applySession(data);
      return data;
    } catch (error) {
      if (!mounted.current) return null;
      if (error.status === 401) {
        applySession(null);
        return null;
      }
      // The API is unreachable (or down) — surface it without wiping the session state.
      setStatus('anonymous');
      return null;
    }
  }, [applySession]);

  useEffect(() => {
    mounted.current = true;
    // `session` is the cheap probe: it tells us whether the cookie is valid
    // without dragging the full profile payload on the public pages.
    authService
      .session()
      .then(({ data }) => {
        if (!mounted.current) return;
        if (data?.authenticated) return refresh();
        applySession(null);
        return null;
      })
      .catch(() => {
        if (mounted.current) applySession(null);
      });
    return () => {
      mounted.current = false;
    };
  }, [applySession, refresh]);

  useEffect(() => onUnauthorized(() => applySession(null)), [applySession]);

  const login = useCallback(
    async (identifier, password) => {
      const { data } = await authService.login(identifier, password);
      applySession(data);
      return data;
    },
    [applySession],
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await authService.register(payload);
      applySession(data);
      return data;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      applySession(null);
    }
  }, [applySession]);

  const value = useMemo(
    () => ({
      user,
      stats,
      status,
      isAuthenticated: status === 'authenticated' && Boolean(user),
      isAdmin: user?.role === 'admin',
      loading: status === 'loading',
      login,
      register,
      logout,
      refresh,
      setUser,
      setStats,
      updateUser: (patch) => setUser((current) => (current ? { ...current, ...patch } : current)),
    }),
    [user, stats, status, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

export default AuthContext;
