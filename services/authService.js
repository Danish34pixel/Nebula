import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../config/api";
import { secureStorage } from "../utils/secureStore";

export const detectIdentifierType = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return { type: "invalid", value: "" };

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { type: "email", value: normalized.toLowerCase() };
  }

  if (/^\+?[0-9]{7,15}$/.test(normalized.replace(/\s+/g, ""))) {
    return { type: "phone", value: normalized.replace(/\s+/g, "") };
  }

  return { type: "invalid", value: normalized };
};

const parseResponseBody = async (response) => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const dedupePayloads = (payloads = []) => {
  const seen = new Set();
  return payloads.filter((payload) => {
    const key = JSON.stringify(payload);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildIdentifierPayloads = ({ role, identifier, password }) => {
  const normalizedIdentifier = String(identifier || "").trim();
  const { type, value } = detectIdentifierType(identifier);
  const commonBase = {
    role,
    ...(password !== undefined ? { password } : {}),
  };

  const identifierValue = normalizedIdentifier.replace(/\s+/g, "");
  const identifierFields = {
    identifier: identifierValue,
    emailOrPhone: identifierValue,
    emailOrMobileNumber: identifierValue,
  };

  if (type === "email") {
    identifierFields.email = value;
    identifierFields.emailAddress = value;
  }

  if (type === "phone") {
    identifierFields.phone = value;
    identifierFields.phoneNumber = value;
    identifierFields.mobileNumber = value;
  }

  const payloads = [
    { ...commonBase, ...identifierFields },
    {
      ...commonBase,
      identifier: identifierValue,
      ...(type === "email" ? { email: value } : {}),
      ...(type === "phone"
        ? { phone: value, phoneNumber: value, mobileNumber: value }
        : {}),
    },
    {
      ...commonBase,
      identifier: identifierValue,
      emailOrPhone: identifierValue,
    },
    {
      ...commonBase,
      identifier: identifierValue,
      emailOrMobileNumber: identifierValue,
    },
    {
      ...commonBase,
      identifier: identifierValue,
      userType: role,
      roleName: role,
    },
  ];

  if (type === "email") {
    payloads.push({
      ...commonBase,
      email: value,
      identifier: identifierValue,
      userType: role,
      roleName: role,
    });
  }

  if (type === "phone") {
    payloads.push({
      ...commonBase,
      phone: value,
      phoneNumber: value,
      mobileNumber: value,
      identifier: identifierValue,
      userType: role,
      roleName: role,
    });
  }

  if (type === "invalid") {
    payloads.push({
      ...commonBase,
      identifier: identifierValue,
      emailOrPhone: identifierValue,
    });
  }

  return dedupePayloads(
    payloads.map((payload) =>
      Object.fromEntries(
        Object.entries(payload).filter(
          ([, itemValue]) =>
            itemValue !== undefined && itemValue !== null && itemValue !== "",
        ),
      ),
    ),
  );
};

const requestWithFallback = async (candidates = [], payloadVariants = []) => {
  let lastError = null;
  const variants = payloadVariants.length ? payloadVariants : [{}];

  for (const endpoint of candidates) {
    for (const payload of variants) {
      try {
        const response = await fetch(apiUrl(endpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const body = await parseResponseBody(response);
        if (response.ok) {
          return body;
        }

        const message =
          body?.message || body?.error || `Request failed (${response.status})`;
        if (response.status === 404 || response.status === 405) {
          lastError = new Error(message);
          lastError.status = response.status;
          lastError.body = body;
          continue;
        }

        // Keep the parsed body on the error even for non-2xx responses —
        // callers may still need fields like accessToken/paymentStatus that
        // travel alongside a success:false status (e.g. trial-expired logins).
        const err = new Error(message);
        err.status = response.status;
        err.body = body;
        throw err;
      } catch (error) {
        lastError = error;
        if (error?.message?.includes("Failed to fetch")) {
          continue;
        }
        throw error;
      }
    }
  }

  throw (
    lastError || new Error("Unable to complete the authentication request.")
  );
};

export const authenticateWithPassword = async ({
  identifier,
  password,
  role,
}) => {
  const payloads = buildIdentifierPayloads({ role, identifier, password });

  const endpoints =
    role === "purchaser"
      ? ["/api/auth/login", "/purchaser/login", "/api/auth/purchaser/login"]
      : ["/api/auth/login", `/api/auth/login/${role}`];

  console.log(
    "[authService] authenticateWithPassword URL candidates:",
    endpoints.map((endpoint) => apiUrl(endpoint)),
  );

  return requestWithFallback(endpoints, payloads);
};

// Link-based password reset — a single canonical endpoint, no fallback
// guessing needed since this is the real, documented backend contract.
export const requestPasswordReset = async ({ email }) => {
  const normalized = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Please enter a valid email address.");
  }

  const response = await fetch(apiUrl("/api/auth/forgot-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalized }),
  });
  const body = await parseResponseBody(response);
  if (!response.ok) {
    const err = new Error(body?.message || `Request failed (${response.status})`);
    err.status = response.status;
    err.body = body;
    throw err;
  }
  return body;
};

// Submits the new password for the emailed reset link — token travels in
// the URL, matching POST /api/auth/reset-password/:token.
export const resetPasswordWithToken = async ({ token, password, confirmPassword }) => {
  if (!token) {
    throw new Error("This reset link is invalid or missing a token.");
  }

  const response = await fetch(
    apiUrl(`/api/auth/reset-password/${encodeURIComponent(token)}`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirmPassword }),
    },
  );
  const body = await parseResponseBody(response);
  if (!response.ok) {
    const err = new Error(body?.message || `Request failed (${response.status})`);
    err.status = response.status;
    err.body = body;
    throw err;
  }
  return body;
};

export const persistAuthState = async ({
  accessToken,
  refreshToken,
  user,
  role,
  rememberMe,
  identifier,
}) => {
  if (accessToken) {
    await secureStorage.setItem("token", accessToken);
  }
  if (refreshToken) {
    await secureStorage.setItem("refreshToken", refreshToken);
  }
  if (user) {
    await AsyncStorage.setItem("user", JSON.stringify(user));
  }
  if (role) {
    await AsyncStorage.setItem("role", role);
  }

  if (rememberMe && identifier) {
    await AsyncStorage.setItem("rememberedIdentifier", identifier);
  }
};
