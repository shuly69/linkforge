"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthResponse, AuthUser, LoginDto, RegisterDto } from "@linkforge/shared";
import { api, tokenStore } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  // On mount, if we hold a token, hydrate the session from /auth/me.
  useEffect(() => {
    let active = true;
    async function hydrate() {
      if (!tokenStore.access) {
        setReady(true);
        return;
      }
      try {
        const { data } = await api.get<{ sub: string; email: string; role: AuthUser["role"] }>(
          "/auth/me",
        );
        if (active) {
          setUser({ id: data.sub, email: data.email, name: null, role: data.role });
        }
      } catch {
        tokenStore.clear();
      } finally {
        if (active) setReady(true);
      }
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((res: AuthResponse) => {
    tokenStore.set(res);
    setUser(res.user);
  }, []);

  const login = useCallback(
    async (dto: LoginDto) => {
      const { data } = await api.post<AuthResponse>("/auth/login", dto);
      persist(data);
    },
    [persist],
  );

  const register = useCallback(
    async (dto: RegisterDto) => {
      const { data } = await api.post<AuthResponse>("/auth/register", dto);
      persist(data);
    },
    [persist],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
