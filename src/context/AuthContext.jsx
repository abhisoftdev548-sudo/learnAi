import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authService } from "../services/authService";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refresh = useCallback(async () => {
    try {
      const data = await authService.me();
      setUser(data);
      setError(null);
      return data;
    } catch (err) {
      if (err.status === 401) {
        setUser(null);
        setError(null);
      } else setError(err);
      throw err;
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    authService
      .me(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setUser(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setUser(null);
          setError(err.status === 401 ? null : err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const expire = () => {
      setUser(null);
      setError(null);
    };
    window.addEventListener("auth:expired", expire);
    return () => window.removeEventListener("auth:expired", expire);
  }, []);
  async function authenticate(type, body) {
    const data = await authService[type](body);
    setUser(data);
    setError(null);
    return data;
  }
  async function logout() {
    await authService.logout();
    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        refresh,
        login: (body) => authenticate("login", body),
        register: (body) => authenticate("register", body),
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
