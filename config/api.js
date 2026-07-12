// Central API configuration helper for Meditrap (React Native / Expo)
import Constants from "expo-constants";
import { Platform } from "react-native";
import { secureStorage } from "../utils/secureStore";

const getExpoExtra = () =>
  Constants.expoConfig?.extra ||
  Constants.manifest2?.extra ||
  Constants.manifest?.extra ||
  {};

const getEnvValue = (key, fallback = "") =>
  process.env[key] || getExpoExtra()[key] || fallback;

// Normalize to remove any trailing slashes
const normalizeBase = (url) =>
  url && url.endsWith("/") ? url.slice(0, -1) : url;

const normalizeToken = (token) => {
  if (token == null) return null;
  const normalized = String(token).trim();
  return normalized.replace(/^Bearer\s+/i, "").trim() || null;
};

const extractExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    "";
  return String(hostUri).split(":")[0] || "";
};

const rewriteLocalhostForDevice = (url) => {
  if (!url) return url;
  if (Platform.OS === "web") return url;

  try {
    const parsed = new URL(url);
    const isLocalHost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1";

    if (!isLocalHost) return url;

    const expoHost = extractExpoHost();
    if (!expoHost) return url;

    parsed.hostname = expoHost;
    return normalizeBase(parsed.toString());
  } catch {
    return url;
  }
};

const getResolvedBase = () => {
  const envDefault =
    getEnvValue("EXPO_PUBLIC_API_BASE_URL") ||
    getEnvValue("EXPO_PUBLIC_API_URL");

  const envWeb = getEnvValue("EXPO_PUBLIC_API_BASE_URL_WEB");
  const envNative = getEnvValue("EXPO_PUBLIC_API_BASE_URL_NATIVE");

  const selectedBase =
    Platform.OS === "web" ? envWeb || envDefault : envNative || envDefault;

  return rewriteLocalhostForDevice(normalizeBase(selectedBase));
};

const resolvedBase = getResolvedBase();
const safeResolvedBase = resolvedBase || "";

if (!safeResolvedBase) {
  console.warn(
    "API base URL was not resolved from env; requests will use a relative path.",
  );
}

export const API_BASE = safeResolvedBase;

// Export helper to inspect resolved base at runtime
export const getRuntimeApiBase = getResolvedBase;

/**
 * Helper to safely build complete URLs.
 * Automatically ensures the '/api' prefix unless already present.
 */
export const apiUrl = (path = "") => {
  const base = getResolvedBase() || safeResolvedBase;
  if (!path) return `${base}/api`;

  // If path already starts with /api, don't duplicate it
  if (path.startsWith("/api")) return `${base}${path}`;
  if (path.startsWith("api")) return `${base}/${path}`;

  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}/api${p}`;
};

// Attempt to exchange a refresh token for a new access token.
// Returns the new access token string, or null on failure.
const tryRefreshAccessToken = async () => {
  try {
    const refreshToken = normalizeToken(
      await secureStorage.getItem("refreshToken"),
    );
    if (!refreshToken) return null;

    const base = getResolvedBase() || safeResolvedBase;
    const res = await fetch(`${base}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.accessToken) {
      await secureStorage.setItem("token", data.accessToken);
      if (data.refreshToken) {
        await secureStorage.setItem("refreshToken", data.refreshToken);
      }
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
};

// JSON Fetch Helper
export const fetchJson = async (path, options = {}, _isRetry = false) => {
  const url = apiUrl(path);
  const token = normalizeToken(await secureStorage.getItem("token"));

  const opts = {
    ...options,
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  const res = await fetch(url, opts);
  const text = await res.text();
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = text && isJson ? JSON.parse(text) : text;

  if (!res.ok) {
    if (res.status === 401 && !_isRetry) {
      // Try to silently refresh the access token once, then retry
      const newToken = await tryRefreshAccessToken();
      if (newToken) {
        return fetchJson(path, options, true);
      }
      // Refresh failed — clear session
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
  const token = normalizeToken(await secureStorage.getItem("token"));

  const controller = new AbortController();
  const timeout = options.timeout || 120000;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timer);
    const text = await res.text();
    const isJson = res.headers
      .get("content-type")
      ?.includes("application/json");
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
    method: "POST",
    body: JSON.stringify(data),
  });
};

export default API_BASE;
