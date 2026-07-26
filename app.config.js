const { config } = require("dotenv");
const { expand } = require("dotenv-expand");

// Load environment file matching APP_ENV, or fallback to development / production defaults.
const envFile = process.env.APP_ENV
  ? `.env.${process.env.APP_ENV}`
  : process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

const loadedEnv = config({ path: envFile, silent: true });
expand(loadedEnv);

if (
  !loadedEnv ||
  !loadedEnv.parsed ||
  Object.keys(loadedEnv.parsed).length === 0
) {
  expand(config({ path: ".env.local", silent: true }));
}

const getEnv = (key, fallback = "") => process.env[key] || fallback;
const normalizeUrl = (value) => (value ? value.replace(/\/+$/, "") : value);
const DEFAULT_API_BASE_URL = "https://api.medi-trap.com";
module.exports = {
  expo: {
    name: "Meditrap",
    slug: "Meditrap",
    version: "55",
    orientation: "portrait",
    icon: "./assets/images/app-icon.png",
    scheme: "meditrap",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: "com.danish.meditrap",
      buildNumber: "11",
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription:
          "Meditrap needs photo library access to upload license, identity, and business documents.",
        NSPhotoLibraryUsageDescription:
          "Meditrap needs access to your photo library to attach documents and profile images.",
        NSPhotoLibraryAddUsageDescription:
          "Meditrap may save images to your photo library for receipts and upload previews.",
      },
    },
    android: {
      package: "com.danish.meditrap",
      versionCode: 11,
      softwareKeyboardLayoutMode: "resize",
      permissions: [],
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
    splash: {
      image: "./assets/images/app-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
      dark: {
        backgroundColor: "#000000",
      },
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
      "expo-notifications",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      API_URL: normalizeUrl(
        getEnv(
          "API_URL",
          getEnv(
            "EXPO_PUBLIC_API_BASE_URL",
            getEnv("EXPO_PUBLIC_API_URL", DEFAULT_API_BASE_URL),
          ),
        ),
      ),
      apiUrl: normalizeUrl(
        getEnv(
          "EXPO_PUBLIC_API_BASE_URL",
          getEnv(
            "EXPO_PUBLIC_API_URL",
            getEnv("API_URL", DEFAULT_API_BASE_URL),
          ),
        ),
      ),
      EXPO_PUBLIC_API_BASE_URL: normalizeUrl(
        getEnv(
          "EXPO_PUBLIC_API_BASE_URL",
          getEnv(
            "EXPO_PUBLIC_API_URL",
            getEnv("API_URL", DEFAULT_API_BASE_URL),
          ),
        ),
      ),
      EXPO_PUBLIC_API_BASE_URL_WEB: normalizeUrl(
        getEnv(
          "EXPO_PUBLIC_API_BASE_URL_WEB",
          getEnv("API_URL", DEFAULT_API_BASE_URL),
        ),
      ),
      EXPO_PUBLIC_API_BASE_URL_NATIVE: normalizeUrl(
        getEnv(
          "EXPO_PUBLIC_API_BASE_URL_NATIVE",
          getEnv("API_URL", DEFAULT_API_BASE_URL),
        ),
      ),
      eas: {
        projectId:
          getEnv("EAS_PROJECT_ID") || "6f1cda02-86c4-49fc-9dbe-5990dbd9cac6",
      },
    },
  },
};
