import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { apiError, apiCode, apiFieldErrors } from '../services/api';

const AuthContext = createContext(null);

/**
 * Auth state machine:
 *   loading -> logged out
 *           -> pending / rejected (authenticated but not approved)
 *           -> ready (approved member or admin)
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading'); // loading | out | pending | rejected | suspended | in
  const [bootError, setBootError] = useState('');

  const applyUser = useCallback((u) => {
    setUser(u);
    if (!u) setAuthStatus('out');
    else if (u.status === 'approved') setAuthStatus('in');
    else setAuthStatus(u.status); // pending | rejected | suspended
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      applyUser(data.data.user);
      setBootError('');
    } catch (err) {
      const code = apiCode(err);
      if (code === 'PENDING_APPROVAL' || code === 'ACCOUNT_REJECTED' || code === 'ACCOUNT_SUSPENDED') {
        // Session exists but account is not approved — surface the status.
        setUser((prev) => prev || null);
        setAuthStatus(code === 'PENDING_APPROVAL' ? 'pending' : code === 'ACCOUNT_REJECTED' ? 'rejected' : 'suspended');
      } else {
        setUser(null);
        setAuthStatus('out');
      }
      if (err?.response && err.response.status >= 500) setBootError(apiError(err));
    }
  }, [applyUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (identifier, password) => {
    try {
      const { data } = await api.post('/auth/login', { identifier, password });
      applyUser(data.data.user);
      return { ok: true, user: data.data.user };
    } catch (err) {
      return { ok: false, message: apiError(err), code: apiCode(err) };
    }
  }, [applyUser]);

  const register = useCallback(async (payload) => {
    try {
      const { data } = await api.post('/auth/register', payload, {
        headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      });
      return { ok: true, user: data.data.user };
    } catch (err) {
      return { ok: false, message: apiError(err), code: apiCode(err), fieldErrors: apiFieldErrors(err) };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* cookie clearing is best-effort */
    }
    setUser(null);
    setAuthStatus('out');
  }, []);

  /** Replace the cached user after profile edits etc. */
  const setUserSafe = useCallback((u) => { setUser(u); }, []);

  const value = useMemo(
    () => ({
      user,
      authStatus,
      bootError,
      isAdmin: user?.role === 'admin' && user?.status === 'approved',
      isAuthenticated: authStatus === 'in' || authStatus === 'pending' || authStatus === 'rejected' || authStatus === 'suspended',
      isApproved: authStatus === 'in',
      login,
      register,
      logout,
      refresh,
      setUser: setUserSafe,
    }),
    [user, authStatus, bootError, login, register, logout, refresh, setUserSafe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
