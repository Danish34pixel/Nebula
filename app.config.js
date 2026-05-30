const { config } = require("dotenv");
const { expand } = require("dotenv-expand");

// Load environment file matching APP_ENV, or fallback to production / local defaults.
const envFile = process.env.APP_ENV
  ? `.env.${process.env.APP_ENV}`
  : process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.local";

expand(config({ path: envFile, silent: true }));

const getEnv = (key, fallback = "") => process.env[key] || fallback;

module.exports = {
  expo: {
    name: "Meditrap",
    slug: "Meditrap",
    version: "45",
    orientation: "portrait",
    icon: "./assets/images/app-icon.png",
    scheme: "meditrap",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: "com.danish.meditrap",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      supportsTablet: true,
    },
    android: {
      package: "com.danish.meditrap",
      versionCode: 11,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/app-icon.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/app-icon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/app-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "expo-secure-store",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      apiUrl: getEnv("EXPO_PUBLIC_API_URL", "https://medi-trap.com/"),
      EXPO_PUBLIC_API_BASE_URL: getEnv(
        "EXPO_PUBLIC_API_BASE_URL",
        getEnv("EXPO_PUBLIC_API_URL"),
      ),
      EXPO_PUBLIC_API_BASE_URL_WEB: getEnv("EXPO_PUBLIC_API_BASE_URL_WEB"),
      EXPO_PUBLIC_API_BASE_URL_NATIVE: getEnv(
        "EXPO_PUBLIC_API_BASE_URL_NATIVE",
      ),
      eas: {
        projectId:
          getEnv("EAS_PROJECT_ID") ||
          "6f1cda02-86c4-49fc-9dbe-5990dbd9cac6",
      },
    },
  },
};
