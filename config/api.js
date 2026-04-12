// Central API configuration helper for Meditrap (React Native / Expo)
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { secureStorage } from "../utils/secureStore";

// Public env vars are embedded into the frontend bundle by Expo.
const ENV_API_DEFAULT =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  '';
const ENV_API_WEB = process.env.EXPO_PUBLIC_API_BASE_URL_WEB || '';
const ENV_API_NATIVE = process.env.EXPO_PUBLIC_API_BASE_URL_NATIVE || '';

// Normalize to remove any trailing slashes
const normalizeBase = (url) =>
  url && url.endsWith('/') ? url.slice(0, -1) : url;

const extractExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    '';
  return String(hostUri).split(':')[0] || '';
};

const rewriteLocalhostForDevice = (url) => {
  if (!url) return url;
  if (Platform.OS === 'web') return url;

  try {
    const parsed = new URL(url);
    const isLocalHost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1';

    if (!isLocalHost) return url;

    const expoHost = extractExpoHost();
    if (!expoHost) return url;

    parsed.hostname = expoHost;
    return normalizeBase(parsed.toString());
  } catch {
    return url;
  }
};

const selectedBase =
  Platform.OS === 'web'
    ? ENV_API_WEB || ENV_API_DEFAULT
    : ENV_API_NATIVE || ENV_API_DEFAULT;

const resolvedBase = rewriteLocalhostForDevice(normalizeBase(selectedBase));

if (!resolvedBase) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_BASE_URL. Set it in .env.local (e.g. http://localhost:5000).'
  );
}

export const API_BASE = resolvedBase;

if (
  process.env.NODE_ENV === "production" &&
  API_BASE.startsWith("http://") &&
  !API_BASE.includes("localhost") &&
  !API_BASE.includes("127.0.0.1")
) {
  throw new Error("In production, EXPO_PUBLIC_API_BASE_URL must use HTTPS.");
}

/**
 * Helper to safely build complete URLs.
 * Automatically ensures the '/api' prefix unless already present.
 */
export const apiUrl = (path = '') => {
  if (!path) return `${API_BASE}/api`;

  // If path already starts with /api, don't duplicate it
  if (path.startsWith('/api')) return `${API_BASE}${path}`;
  if (path.startsWith('api')) return `${API_BASE}/${path}`;

  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}/api${p}`;
};

// JSON Fetch Helper
export const fetchJson = async (path, options = {}) => {
  const url = apiUrl(path);
  const token = await secureStorage.getItem("token");
  if (__DEV__) console.log(`[API] ${options.method || 'GET'} -> ${url}`);

  const opts = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(options.token || token ? { Authorization: `Bearer ${options.token || token}` } : {}),
    },
    ...options,
  };

  const res = await fetch(url, opts);
  const text = await res.text();
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = text && isJson ? JSON.parse(text) : text;

  if (!res.ok) {
    if (res.status === 401) {
      await secureStorage.removeItem("token");
      await secureStorage.removeItem("refreshToken");
      await secureStorage.removeItem("user");
    }
    const err = new Error(body?.message || `Request failed ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
};

// Central request helper (Alias for fetchJson)
export const requestJson = fetchJson;

// POST FormData Helper (Image Uploads)
export const postForm = async (path, formData, options = {}) => {
  const url = apiUrl(path);
  const token = await secureStorage.getItem("token");

  const controller = new AbortController();
  const timeout = options.timeout || 120000;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timer);
    const text = await res.text();
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const body = text && isJson ? JSON.parse(text) : text;

    if (!res.ok) {
      const err = new Error(body?.message || `Request failed ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }

    return body;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
};

// POST JSON Helper
export const postJson = async (path, data, options = {}) => {
  return fetchJson(path, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export default API_BASE;
