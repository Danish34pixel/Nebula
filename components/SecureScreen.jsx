import { Platform, AppState, Modal, View, Text, StyleSheet } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSecurityConfig } from "../context/SecurityContext";

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL iOS APP-SWITCHER COUNTER
//
// Tracks mounted SecureScreen count for enableAppSwitcherProtectionAsync, which
// has no key parameter. We only enable when the first instance mounts and only
// disable when the last instance unmounts.
//
// Generation number: every enable call increments _switcherGeneration. The
// corresponding disable only fires if the generation hasn't changed since.
// This prevents a Concurrent-Mode race where an async disableAppSwitcher call
// resolves after a subsequent enable, leaving iOS protection off.
// ─────────────────────────────────────────────────────────────────────────────
let _activeSwitcherCount = 0;
let _switcherGeneration = 0;

function _enableAppSwitcher() {
  _activeSwitcherCount += 1;
  if (_activeSwitcherCount === 1 && Platform.OS === "ios") {
    const gen = ++_switcherGeneration;
    ScreenCapture.enableAppSwitcherProtectionAsync(1.0)
      .then(() => {
        // Discard if a newer enable/disable cycle has already run
        if (_switcherGeneration !== gen) return;
      })
      .catch(() => {});
  }
}

function _disableAppSwitcher() {
  _activeSwitcherCount = Math.max(0, _activeSwitcherCount - 1);
  if (_activeSwitcherCount === 0 && Platform.OS === "ios") {
    const gen = _switcherGeneration; // snapshot before async
    ScreenCapture.disableAppSwitcherProtectionAsync()
      .then(() => {
        // If a new enable ran between our call and resolution, re-enable
        if (_switcherGeneration !== gen) {
          ScreenCapture.enableAppSwitcherProtectionAsync(1.0).catch(() => {});
        }
      })
      .catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SecureScreen
//
// ─────── PROTECTION LAYERS ───────────────────────────────────────────────────
//
// ANDROID
//  • preventScreenCaptureAsync → FLAG_SECURE on the activity window.
//    Covers screenshots, screen recordings, AND the recents thumbnail.
//    All three appear black. No further native work needed.
//
// iOS
//  • preventScreenCaptureAsync → UIKit blackout.
//    iOS 13+: screenshots black.  iOS 11+: recordings black.
//  • enableAppSwitcherProtectionAsync(1.0) → maximum-intensity OS blur on
//    every snapshot the system takes (switcher, background, Siri, calls).
//    Fires at the OS level before JS re-renders.
//  • AppState listener + native <Modal> overlay:
//    When state becomes 'inactive' a native Modal opens. Because it is a
//    real RN Modal it renders in its own native window and sits ABOVE any
//    transparent Modals already open in the app (StaffModel, medicine detail,
//    etc.), closing the overlay-escape vulnerability.
//  • addScreenshotListener → dev-mode audit logging only.
//
// WEB
//  • Screenshots/recordings cannot be prevented (no browser API).
//  • visibilitychange + blur/focus → overlay on tab hide / window blur.
//  • pagehide/pageshow → bfcache back-forward navigation.
//  • beforeprint/afterprint → blocks Print-to-PDF capture.
//  • Same native Modal approach does not apply on web; the overlay is a
//    positioned View (web has no separate native window layer).
//
// ─────── SECURITY NOTES ──────────────────────────────────────────────────────
//  Prop `enabled` controls per-screen opt-out. Global control lives in
//  SecurityContext.globalEnabled (toggled only via useSecurityAdmin, not
//  the public useSecurityConfig hook).
// ─────────────────────────────────────────────────────────────────────────────
export default function SecureScreen({ children, style, enabled = true }) {
  const { globalEnabled, logSecurityEvent } = useSecurityConfig();
  const isActive = enabled && globalEnabled;

  const [isBlurred, setIsBlurred] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // Unique key per instance: prevents the shared-key bug where the first
  // unmounting SecureScreen triggers allowScreenCapture while others are still
  // mounted (expo-screen-capture's activeTags Set uses the key as an identity).
  const captureKeyRef = useRef(
    `secure-${Math.random().toString(36).slice(2, 9)}`
  );

  // isMounted guard: if the component unmounts while preventScreenCaptureAsync
  // is still in-flight, its resolution would set FLAG_SECURE permanently.
  // We use this ref to call allowScreenCaptureAsync immediately on resolution
  // if the component has already cleaned up.
  const isMountedRef = useRef(true);

  const blurOn = useCallback(() => setIsBlurred(true), []);
  const blurOff = useCallback(() => setIsBlurred(false), []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      setIsBlurred(false);
      return;
    }

    const key = captureKeyRef.current;

    if (Platform.OS !== "web") {
      // ── NATIVE ─────────────────────────────────────────────────────────────

      // Layer 1 — OS capture prevention (FLAG_SECURE / UIKit).
      // Guard: if component unmounts before the promise resolves, immediately
      // re-allow so we don't leave FLAG_SECURE permanently set.
      ScreenCapture.preventScreenCaptureAsync(key)
        .then(() => {
          if (!isMountedRef.current) {
            ScreenCapture.allowScreenCaptureAsync(key).catch(() => {});
          }
        })
        .catch(() => {});
      logSecurityEvent("CAPTURE_PREVENTION_ENABLED", { key, platform: Platform.OS });

      // Layer 2 (iOS) — native app-switcher blur via generation-tracked counter.
      _enableAppSwitcher();

      // Layer 3 — React overlay via AppState.
      // We render the overlay as a <Modal> (see JSX below) so it covers any
      // transparent Modals that the screen may have open (StaffModel, medicine
      // detail, etc.), which would otherwise escape a View-based overlay.
      const appStateSub = AppState.addEventListener("change", (nextState) => {
        if (nextState === "background" || nextState === "inactive") {
          blurOn();
          logSecurityEvent("APP_BACKGROUND_OVERLAY_SHOWN", { nextState });
        } else if (nextState === "active") {
          blurOff();
          logSecurityEvent("APP_FOREGROUND_OVERLAY_CLEARED", { nextState });
        }
        appStateRef.current = nextState;
      });

      // Layer 4 — screenshot attempt logging (dev audit trail only).
      const screenshotSub = ScreenCapture.addScreenshotListener(() => {
        logSecurityEvent("SCREENSHOT_ATTEMPT_DETECTED", { key, platform: Platform.OS });
      });

      return () => {
        ScreenCapture.allowScreenCaptureAsync(key).catch(() => {});
        _disableAppSwitcher();
        appStateSub.remove();
        screenshotSub.remove();
        logSecurityEvent("CAPTURE_PREVENTION_DISABLED", { key });
      };
    } else {
      // ── WEB ────────────────────────────────────────────────────────────────

      const onVisibility = () => {
        if (document.hidden) {
          blurOn();
          logSecurityEvent("WEB_TAB_HIDDEN");
        } else {
          blurOff();
          logSecurityEvent("WEB_TAB_VISIBLE");
        }
      };

      const onBlur = () => {
        blurOn();
        logSecurityEvent("WEB_WINDOW_BLUR");
      };

      // Re-check document.hidden on focus to avoid un-blurring a hidden tab.
      const onFocus = () => {
        if (!document.hidden) {
          blurOff();
          logSecurityEvent("WEB_WINDOW_FOCUS");
        }
      };

      const onPageHide = () => {
        blurOn();
        logSecurityEvent("WEB_PAGE_HIDE");
      };
      const onPageShow = () => {
        if (!document.hidden) {
          blurOff();
          logSecurityEvent("WEB_PAGE_SHOW");
        }
      };

      const onBeforePrint = () => {
        blurOn();
        logSecurityEvent("WEB_PRINT_ATTEMPT_BLOCKED");
      };
      const onAfterPrint = () => {
        if (!document.hidden) blurOff();
      };

      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("blur", onBlur);
      window.addEventListener("focus", onFocus);
      window.addEventListener("pagehide", onPageHide);
      window.addEventListener("pageshow", onPageShow);
      window.addEventListener("beforeprint", onBeforePrint);
      window.addEventListener("afterprint", onAfterPrint);
      logSecurityEvent("WEB_PROTECTION_ENABLED");

      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("pagehide", onPageHide);
        window.removeEventListener("pageshow", onPageShow);
        window.removeEventListener("beforeprint", onBeforePrint);
        window.removeEventListener("afterprint", onAfterPrint);
        logSecurityEvent("WEB_PROTECTION_DISABLED");
      };
    }
  }, [isActive, blurOn, blurOff, logSecurityEvent]);

  return (
    <View style={[styles.root, style]}>
      {children}

      {/*
        OVERLAY RENDERED AS A NATIVE MODAL — not a positioned View.
        RN Modal allocates its own native window above all existing Modals
        regardless of z-index. This prevents transparent Modals (StaffModel,
        medicine detail) from escaping the overlay when the app backgrounds.
        animationType="none" avoids a visible flash during AppState transitions.
        onRequestClose is a no-op: hardware back must not dismiss the overlay.
        statusBarTranslucent (Android) ensures the overlay covers the status bar.
      */}
      {Platform.OS !== "web" ? (
        <Modal
          visible={!!(isBlurred && isActive)}
          transparent={false}
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => {}}
        >
          <View style={styles.overlay}>
            <View style={styles.badge}>
              <Feather name="lock" size={40} color="#94a3b8" />
              <Text style={styles.title}>Protected Content</Text>
              <Text style={styles.subtitle}>
                Return to the app to view this screen
              </Text>
            </View>
          </View>
        </Modal>
      ) : (
        // Web: Modal-as-native-window does not apply; use a positioned View.
        // Web Modals are DOM portals — they still escape this overlay.
        // Mitigate by ensuring no web screen opens a Modal with sensitive data
        // that is not independently protected.
        isBlurred && isActive && (
          <View style={styles.overlay} pointerEvents="box-only">
            <View style={styles.badge}>
              <Feather name="lock" size={40} color="#94a3b8" />
              <Text style={styles.title}>Protected Content</Text>
              <Text style={styles.subtitle}>
                Return to this tab to view protected content
              </Text>
            </View>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: { alignItems: "center", paddingHorizontal: 32 },
  title: {
    color: "#e2e8f0",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});
