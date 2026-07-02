import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import type { AuthResponse } from "@linkforge/shared";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const ACCESS_KEY = "lf_access";
const REFRESH_KEY = "lf_refresh";

export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: { accessToken: string; refreshToken: string }) {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/v1`,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Transparent refresh: on a 401, try once to rotate tokens, then replay the
// original request. A single in-flight refresh is shared across callers.
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      tokenStore.refresh
    ) {
      original._retried = true;
      refreshing ??= rotate();
      const newAccess = await refreshing;
      refreshing = null;

      if (newAccess) {
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      }
    }
    return Promise.reject(normalizeError(error));
  },
);

async function rotate(): Promise<string | null> {
  try {
    const { data } = await axios.post<AuthResponse>(
      `${API_URL}/v1/auth/refresh`,
      { refreshToken: tokenStore.refresh },
    );
    tokenStore.set(data);
    return data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

export interface NormalizedError {
  status: number;
  message: string;
}

function normalizeError(error: AxiosError): NormalizedError {
  const data = error.response?.data as { message?: string | string[] } | undefined;
  const raw = data?.message;
  const message = Array.isArray(raw) ? raw.join(", ") : (raw ?? error.message);
  return { status: error.response?.status ?? 0, message };
}
