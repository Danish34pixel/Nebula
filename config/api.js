// Central API configuration helper for Meditrap (React Native / Expo)
import Constants from "expo-constants";
import { Platform } from "react-native";
import { secureStorage } from "../utils/secureStore";

// Public env vars are embedded into the frontend bundle by Expo.
const ENV_API_DEFAULT =
  process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || "";
const ENV_API_WEB = process.env.EXPO_PUBLIC_API_BASE_URL_WEB || "";
const ENV_API_NATIVE = process.env.EXPO_PUBLIC_API_BASE_URL_NATIVE || "";
const DEV_API_DEFAULT = "https://api.medi-trap.com";

// Normalize to remove trailing slash and whitespace
const normalizeBase = (url) => String(url || "").trim().replace(/\/+$/, "");

const extraApiUrl =
  Constants.expoConfig?.extra?.apiUrl ||
  Constants.manifest2?.extra?.apiUrl ||
  Constants.manifest?.extra?.apiUrl ||
  "";

const extractExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoConfig?.extra?.expoGo?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    "";

  const host = String(hostUri).split(":")[0].trim();
  return host || null;
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

const isDev = __DEV__ || process.env.NODE_ENV === "development";

const selectedBase =
  Platform.OS === "web"
    ? isDev
      ? DEV_API_DEFAULT
      : ENV_API_WEB || ENV_API_DEFAULT || extraApiUrl
    : isDev
      ? DEV_API_DEFAULT
      : ENV_API_NATIVE || ENV_API_DEFAULT || extraApiUrl;

const resolvedBase = rewriteLocalhostForDevice(normalizeBase(selectedBase));

if (!resolvedBase) {
  throw new Error(
    "Missing EXPO_PUBLIC_API_BASE_URL. Set it in .env.local (e.g. https://api.medi-trap.com).",
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

const normalizeToken = (token) => {
  if (token == null) return null;
  const normalized = String(token).trim();
  return normalized.replace(/^Bearer\s+/i, "").trim() || null;
};

/**
 * Helper to safely build complete URLs.
 * Automatically ensures the '/api' prefix unless already present.
 */
export const apiUrl = (path = "") => {
  if (!path) return `${API_BASE}/api`;

  // If path already starts with /api, don't duplicate it
  if (path.startsWith("/api")) return `${API_BASE}${path}`;
  if (path.startsWith("api")) return `${API_BASE}/${path}`;

  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}/api${p}`;
};

// JSON Fetch Helper
export const fetchJson = async (path, options = {}) => {
  try {
    const url = apiUrl(path);
    const token = normalizeToken(await secureStorage.getItem("token"));
    const headerToken = normalizeToken(options.token || token);
    if (__DEV__) console.log(`[API] ${options.method || "GET"} -> ${url}`);

    const opts = {
      ...options,
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(headerToken ? { Authorization: `Bearer ${headerToken}` } : {}),
      },
    };

    const res = await fetch(url, opts);
    const text = await res.text();
    const isJson = res.headers.get("content-type")?.includes("application/json");
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

    if (Array.isArray(body)) {
      return { data: body };
    }

    return body;
  } catch (error) {
    console.error("[API] fetchJson failed", {
      path,
      method: options.method || "GET",
      message: error?.message || String(error),
    });
    throw error;
  }
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
  } catch (error) {
    console.error("[API] postForm failed", {
      path,
      message: error?.message || String(error),
    });
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

// POST JSON Helper
export const postJson = async (path, data, options = {}) => {
  if (__DEV__) {
    console.log("[API] postJson payload", path, data);
  }
  return fetchJson(path, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
};

export default API_BASE;
