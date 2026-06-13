# Meditrap — Screen Protection Security Audit

**Date:** 2026-06-13  
**Scope:** Client-side screen capture protection system  
**Platform:** React Native / Expo 54 (iOS, Android, Web)

---

## 1. What Is Implemented

| Layer | Mechanism | Platform | Effectiveness |
|---|---|---|---|
| Screenshot → black capture | `FLAG_SECURE` via `preventScreenCaptureAsync()` | Android | High — OS-enforced |
| Screen recording → black frames | `FLAG_SECURE` via `preventScreenCaptureAsync()` | Android | High — OS-enforced |
| Screenshot → black capture | UIKit blackout via `preventScreenCaptureAsync()` | iOS 13+ | High — OS-enforced |
| Screen recording → black frames | UIKit API via `preventScreenCaptureAsync()` | iOS 11+ | High — OS-enforced |
| App-switcher thumbnail hidden | `FLAG_SECURE` (auto via above) | Android | High |
| App-switcher thumbnail blurred | `enableAppSwitcherProtectionAsync(1.0)` | iOS | High — native OS blur |
| App-background overlay | `AppState` listener → black React overlay | iOS + Android | Medium — JS-level |
| Tab switch hidden | `document.visibilitychange` → black overlay | Web | Medium — browser-level |
| Window focus loss hidden | `window.blur/focus` events | Web | Medium — browser-level |
| Back/forward navigation hidden | `pagehide/pageshow` events | Web | Medium — browser-level |
| Print / Print-to-PDF blocked | `beforeprint/afterprint` events | Web | Medium — browser-level |
| Screenshot attempt logging | `addScreenshotListener` | iOS + Android | Dev audit only |
| Centralised control | `SecurityContext` + `SecurityProvider` | All | Configuration |
| Per-role protection | `ROLE_PROTECTION_MAP` in `SecurityContext` | All | Configuration |

---

## 2. Remaining Limitations

### 2.1 Native (iOS / Android)

**iOS — No runtime recording-state detection**  
`expo-screen-capture` does not expose `UIScreen.main.isCaptured`. There is no way
in the Expo managed workflow to show an in-app overlay in real-time when a screen
recording starts. The content IS already black in the recording (due to
`preventScreenCaptureAsync`), so this is a UX gap, not a security gap.

*Mitigation:* The black capture output means the data is never exposed, even if
the user does not see an overlay. A custom native Expo module wrapping
`UIScreen.isCaptured` and publishing an event would close this gap.

**iOS < 13 — Screenshots not blacked out**  
`preventScreenCaptureAsync` only blacks out screenshots on iOS 13+. Devices on
iOS 11–12 will still produce readable screenshots; only screen recordings are
blacked out (iOS 11+).

*Mitigation:* Our React `AppState` overlay still hides content when the app is
backgrounded. For foreground screenshots on iOS 11–12, no solution exists in the
Expo managed workflow without ejecting.

**Android — FLAG_SECURE UI restrictions**  
`FLAG_SECURE` prevents ANY screen capture while the flag is set, including
accessibility tools that rely on screen reading (e.g. TalkBack screen reading
features that capture screen state). This may cause accessibility issues.

*Mitigation:* Accept the trade-off for medical data screens; document it for QA.

**Android ≤ 12 — Screenshot listener requires permission**  
`addScreenshotListener` requires `READ_EXTERNAL_STORAGE` (≤ Android 12) or
`READ_MEDIA_IMAGES` (Android 13). The current implementation does not request
this permission, so the listener may be silently inactive on older Android.

*Mitigation:* Call `ScreenCapture.requestPermissionsAsync()` before registering
the listener if screenshot logging is required beyond dev mode.

---

### 2.2 Web

**Screenshots cannot be prevented**  
Browsers expose no API for blocking or detecting external screen capture tools
(OS-level PrtScr, Snipping Tool, Greenshot, etc.). This is a fundamental browser
security boundary: a web page cannot observe or control the host OS.

**Screen recording cannot be detected**  
When a user or third party records the screen using OBS, QuickTime, or a Chrome
extension, the page has no awareness of it. The `getDisplayMedia` API only fires
when the current page initiates screen sharing itself.

**Blur/focus heuristics are bypassable**  
`visibilitychange` and `window.blur` are DOM-level events. A determined attacker
who has compromised the browser process can suppress these events or read DOM
state directly without triggering them. These events protect against casual
shoulder-surfing and accidental exposure, not against technical attacks.

**`beforeprint` does not block all screenshot paths**  
`Print to PDF` via the browser print dialog is blocked. However, OS-level
print-screen keys, external capture tools, and browser DevTools "Capture full
page screenshot" bypass `beforeprint`.

---

## 3. Bypass Possibilities

| Attack Vector | Platform | Bypassed? | Difficulty |
|---|---|---|---|
| OS-level screenshot (PrtScr) | Web | **YES** — not blockable | Trivial |
| Browser DevTools "Capture screenshot" | Web | **YES** — not blockable | Trivial |
| Screen recording via OBS / QuickTime | Web | **YES** — not blockable | Easy |
| Screen recording app on Android | Android | No — FLAG_SECURE blacks out | Blocked |
| Screenshot on Android | Android | No — FLAG_SECURE blacks out | Blocked |
| Screenshot on iOS 13+ | iOS | No — UIKit blacks out | Blocked |
| ADB `screencap` on Android | Android | No — FLAG_SECURE applies to `screencap` | Blocked |
| ADB `screenrecord` on Android | Android | No — FLAG_SECURE applies | Blocked |
| Rooted Android device | Android | **Possible** — root can bypass FLAG_SECURE | High |
| Jailbroken iOS device | iOS | **Possible** — jailbreak bypasses UIKit APIs | High |
| iOS < 13 foreground screenshot | iOS | **YES** — UIKit screenshot API not available | Trivial |
| App switcher shoulder-surf | iOS | No — blur overlay active | Blocked |
| App switcher shoulder-surf | Android | No — FLAG_SECURE blanks thumbnail | Blocked |
| Tab screenshot while visible | Web | **YES** — unavoidable | Trivial |
| Tab screenshot after tab switch | Web | No — overlay shown | Blocked |
| Physical camera pointed at screen | All | **YES** — physically unblockable | Trivial |

---

## 4. Enterprise-Level Improvements (Recommended)

### 4.1 Short-term (No native ejecting required)

**a. Request screenshot listener permission on Android**
```js
import * as ScreenCapture from "expo-screen-capture";
const { granted } = await ScreenCapture.requestPermissionsAsync();
```
Wire this into the app's permission request flow so the listener is active on
Android ≤ 12 in production.

**b. Add screen capture watermarking**  
Even though screenshots cannot be blocked on web, you can overlay a hidden
watermark with the logged-in user's ID/email using opacity-near-zero text.
If a screenshot leaks, forensic analysis can identify the source account.

**c. Implement session timeout on sensitive screens**  
After 5 minutes of inactivity (no user touch), trigger logout or re-authentication.
This protects against physical access to an unlocked device.

**d. Add biometric re-authentication for high-sensitivity actions**  
Use `expo-local-authentication` to require Face ID / fingerprint before viewing
drug license images, identity cards, or admin user lists.

### 4.2 Medium-term (Requires EAS custom build or bare workflow)

**e. Custom iOS native module for recording detection**  
Create an Expo Module that listens to `UIScreen.isCaptured` via
`NotificationCenter` (`UIScreenCapturedDidChangeNotification`). This lets you
show a "Recording in progress — content blurred" overlay on iOS in real time.

**f. Android SafetyNet / Play Integrity attestation**  
Call the Play Integrity API at login. If the device is rooted or the app has been
tampered with, deny access or downgrade to read-only mode. Prevents rooted-device
FLAG_SECURE bypass.

**g. Certificate pinning**  
Pin the TLS certificate for `api.medi-trap.com` to prevent MITM attacks that
could capture sensitive API responses even when the screen is protected.

### 4.3 Long-term (Backend + infrastructure)

**h. Server-side watermarking of images**  
Drug license images and identity card photos returned from the API should carry
an invisible EXIF watermark containing user ID and request timestamp. Even a
physical camera photo of the screen can be traced.

**i. API rate limiting on sensitive endpoints**  
Endpoints that return drug license numbers, blood groups, or identity cards
(`/api/auth/me`, `/api/staff/:id`, `/api/purchasing-card/requests`) should be
rate-limited and logged server-side with the requesting user's ID and IP.

**j. Role-based field masking on the API**  
Have the API return masked fields (e.g. `DL-****-1234` instead of full license
number) for roles that do not strictly need the full value. Reduces the value of
a screenshot even if capture prevention fails.

**k. Audit log for sensitive data access**  
Every access to `/api/auth/me`, identity cards, and admin lists should be logged
server-side with timestamp, user ID, IP, and user-agent. Surface suspicious
patterns (bulk access, off-hours access) via alerts.

---

## 5. File Reference

| File | Purpose |
|---|---|
| `components/SecureScreen.jsx` | Core multi-layer protection wrapper |
| `components/ProtectedRoute.jsx` | Role-aware wrapper; reads user role from AsyncStorage |
| `context/SecurityContext.jsx` | Centralised control, role map, dev logging |
| `utils/usePreventScreenCapture.js` | Thin hook for non-screen contexts |
| `app/_layout.jsx` | Mounts `SecurityProvider` at root |

Protected screens (15 total): `profile`, `demand`, `Home/Screen`, `Home/index`,
`Admin/index`, `Admin/users`, `Admin/stockists`, `Admin/medical-management`,
`Admin/create-company`, `Staff/[id]`, `Staff/Createstaff`, `Stockist/[id]`,
`Stockist/stockist-dashboard`, `Purchaser/[id]`, `MedicalOwner/instant-demand`.
