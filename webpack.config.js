const createExpoWebpackConfigAsync = require("@expo/webpack-config");
const { config } = require("dotenv");
const { expand } = require("dotenv-expand");

const envFile = process.env.APP_ENV
  ? `.env.${process.env.APP_ENV}`
  : process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.local";

const loadedEnv = config({ path: envFile, silent: true });
expand(loadedEnv);

if (
  process.env.NODE_ENV === "production" &&
  (!loadedEnv ||
    !loadedEnv.parsed ||
    Object.keys(loadedEnv.parsed).length === 0)
) {
  expand(config({ path: ".env.local", silent: true }));
}

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  const proxyCandidate =
    process.env.API_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL_WEB ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    "http://localhost:5002";

  const proxyTarget = proxyCandidate
    .replace(/https?:\/\/localhost:5000/g, "http://localhost:5002")
    .replace(/https?:\/\/127\.0\.0\.1:5000/g, "http://127.0.0.1:5002");

  if (config.devServer && proxyTarget) {
    config.devServer.proxy = {
      "/api": {
        target: proxyTarget.replace(/\/+$/, ""),
        secure: false,
        changeOrigin: true,
        ws: false,
      },
    };
  }

  return config;
};
