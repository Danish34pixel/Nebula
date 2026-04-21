import { useEffect } from "react";
import * as ScreenCapture from "expo-screen-capture";

export default function usePreventScreenCapture(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, [enabled]);
}
