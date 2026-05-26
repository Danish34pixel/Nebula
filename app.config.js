const { config } = require("dotenv");
const { expand } = require("dotenv-expand");
const appJson = require("./app.json");

// Load environment file matching APP_ENV, or fallback to production / local defaults.
const envFile = process.env.APP_ENV
  ? `.env.${process.env.APP_ENV}`
  : process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.local";

expand(config({ path: envFile, silent: true }));

const getEnv = (key, fallback = "") => process.env[key] || fallback;

const extra = {
  EXPO_PUBLIC_API_BASE_URL: getEnv(
    "EXPO_PUBLIC_API_BASE_URL",
    getEnv("EXPO_PUBLIC_API_URL"),
  ),
  EXPO_PUBLIC_API_BASE_URL_WEB: getEnv("EXPO_PUBLIC_API_BASE_URL_WEB"),
  EXPO_PUBLIC_API_BASE_URL_NATIVE: getEnv("EXPO_PUBLIC_API_BASE_URL_NATIVE"),
};

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra,
  },
};
