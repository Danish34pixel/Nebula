import { useEffect, useRef } from "react";
import * as ScreenCapture from "expo-screen-capture";
import { useSecurityConfig } from "../context/SecurityContext";

/**
 * usePreventScreenCapture — lightweight hook for screenshot prevention.
 *
 * For full protection (AppState overlay, iOS app-switcher blur, web visibility
 * hiding, and per-role control) use the <SecureScreen> wrapper component from
 * components/SecureScreen.jsx instead. Use this hook only when you need
 * capture prevention in a non-screen context (e.g. a modal or a custom layout).
 *
 * @param {boolean} enabled  Pass false to skip prevention. Defaults to true.
 */
export default function usePreventScreenCapture(enabled = true) {
  const { globalEnabled, logSecurityEvent } = useSecurityConfig();
  const isActive = enabled && globalEnabled;

  // Unique key per hook instance so allowScreenCaptureAsync reference-counts
  // correctly when multiple hooks are active simultaneously.
  const keyRef = useRef(`hook-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (!isActive) return;
    const key = keyRef.current;
    // FLAG_SECURE (Android) / UIKit blackout (iOS 11+/13+)
    ScreenCapture.preventScreenCaptureAsync(key).catch(() => {});
    logSecurityEvent("HOOK_CAPTURE_PREVENTION_ENABLED", { key });
    return () => {
      ScreenCapture.allowScreenCaptureAsync(key).catch(() => {});
      logSecurityEvent("HOOK_CAPTURE_PREVENTION_DISABLED", { key });
    };
  }, [isActive, logSecurityEvent]);
}
