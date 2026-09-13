# MediTrap (React Native) — Full App Wiring & Role Reference

Documentation only. No code in this project modified. Covers whole app: route map, every role (Stockist, Purchaser, Medical Owner, Staff, **Admin**), navigation wiring, contexts, API layer, security layer.

---

## 1. Roles in the system

| Role (DB value) | Entry login screen | Home destination | Special gate |
|---|---|---|---|
| `medicalOwner` / `medical` / `retailer` / `medicalretailer` / `user` | `/login` | `/Home` | `MedicalMiddle` (admin verification), `PaymentRequiredGate` (trial expiry) |
| `purchaser` | `/Purchaser/purchaser-login` | `/Purchaser/{userId}` | `purchasermiddle` (3-stockist approval) |
| `stockist` | `/Stockist/stockist-login` | `/Stockist/stockist-dashboard` | `/Stockist/stockist-verification` (unapproved gate) |
| `staff` | `/Staff/staff-login` | `/Staff/{userId}` | none seen at login layer |
| `admin` | `/login` (same screen as Medical Owner — **no dedicated admin login UI**) | `/Admin` | none — `user.role === "admin"` from backend is the only signal |

**Key fact:** there is no separate "Admin" login screen or role-select card. An admin is just an account whose backend `user.role` comes back as `"admin"`. Whoever logs in through the generic `/login` screen with admin credentials gets routed straight to `/Admin` by `getHomeRouteForRole`, because routing is driven entirely by the backend's returned role, not by which screen was used to log in (see `LOGIC_REFERENCE.md` §1.4). Admin status also drives an "Admin Panel" button rendered on the Home screen for any user whose stored role is `admin` (`app/Home/Screen.jsx`, `isAdmin = user.role === "admin"`) — belt-and-braces access if an admin ever lands on `/Home` instead.

---

## 2. Root wiring: `app/_layout.jsx`

- Wraps the entire app in `<SecurityProvider>` (screen-capture protection context) → `<SafeAreaProvider>` → an Expo Router `<Stack>` listing every registered route (headers hidden globally: `headerShown: false`).
- `GlobalFullscreenAd`: renders `<AdToast>` on every screen **except** when there's no session token, or the current path is in `AUTH_ROUTES` (login/signup/verification/profile screens). Session presence is read fresh from `secureStorage` on every path change.
- `LegalFooter` renders only on `LEGAL_ROUTES` (about, privacy-policy, terms, refund/return/shipping policy, contact-us).
- `setNotificationChannel()` fires once on mount (`app/utils/notifications.js`) — sets up the Android push notification channel.

---

## 3. Full route map (`app/` = Expo Router file-based routes)

### Public / pre-auth
- `/` (`index.jsx`) — role-select landing (4 cards: Stockist, Medical Owner, Purchaser, Staff) → routes to the matching login screen.
- `/login` — Medical Owner (and, incidentally, Admin) login.
- `/forgot-password`, `/reset-password/[token]` — role-agnostic password reset (backend looks up by email across all roles).
- `/about`, `/privacy-policy`, `/terms-and-conditions`, `/refund-policy`, `/return-policy`, `/shipping-policy`, `/contact-us` — static legal pages, shown with `LegalFooter`.

### Medical Owner
- `/MedicalOwner/MedicalSignup` — registration.
- `/MedicalOwner/MedicalMiddle` — post-signup polling screen: waits for admin verification (polls every 4s using `pendingStockistId`/`pendingUserId`/`pendingUserCreds`/stored `user`; on approval clears pending keys and proceeds).
- `/Home` (`Home/index.jsx`, `Home/Screen.jsx`, `Home/Nav.jsx`) — main dashboard for medical owners; shows Admin Panel button if `user.role === "admin"`.
- `/MedicalOwner/create-demand`, `/MedicalOwner/instant-demand`, `/MedicalOwner/demand-history`, `/MedicalOwner/urgent-request` — feature screens reached from Home.
- `/demand.jsx`, `/demand-chat/[id]` — demand browsing/chat.
- `/company/[id]/products` — company product listing.

### Purchaser
- `/Purchaser/purchaser-login`, `/Purchaser/purchaser-signup`.
- `/purchasermiddle` — post-signup polling: waits for 3-stockist approval (checks Purchaser doc `approved`/`verified`, then `PurchaseCardRequest` approval count ≥ 3); on success clears `pendingPurchaserId`/`pendingPurchasingRequestId` and sends back to `/Purchaser/purchaser-login` (user must log in again — this screen does not auto-log-in).
- `/Purchaser/[id]` — purchaser home/dashboard (dynamic route keyed by user id, per `getHomeRouteForRole`).
- `/Purchaser/urgent-requests` — urgent request list.

### Stockist
- `/Stockist/stockist-login`, `/Stockist/stockist-signup`.
- `/Stockist/stockist-verification` — reached when an unapproved stockist logs in (`AuthFlowScreen`'s stockist gate, see `LOGIC_REFERENCE.md` §4).
- `/Stockist/stockist-dashboard` — home destination once approved.
- `/Stockist/[id]` — stockist detail/profile.
- `/Stockist/orders`, `/Stockist/order-detail/[id]` — order management.
- `/Stockist/demand-inbox` — incoming demand requests.

### Staff
- `/Staff/staff-login`, `/Staff/Createstaff` (signup).
- `/Staff/[id]` — staff home destination (dynamic route by user id).
- `/Staff/StaffModel.jsx` — a modal component (not proven a standalone route; referenced by `SecureScreen`'s comments as an example of a transparent modal that needs overlay coverage).

### Admin (`/Admin/*`) — reached only via `getHomeRouteForRole("admin", …)` or the Home "Admin Panel" button
- `/Admin` (`Admin/index.jsx`) — dashboard menu, wrapped in `<SecureScreen>` (screen-capture protected). Fetches `/admin/pending-users/count` on focus to badge the "Payment Verification" tile. Menu items:
  - **Payment Verification** → `/Admin/pending-payments` (badge shows live pending count).
  - **Purchaser Management** → `/Admin/users` (approve/decline purchaser registrations).
  - **Stockist Management** → `/Admin/stockists` (verify supplier applications).
  - **Create Company** → `/Admin/create-company`.
  - **Medical Management** → `/Admin/medical-management` (approve/decline medical retailer registrations).
  - **Create Medicine** → `/Admin/create-medicine`.
  - **Manage Ads** → `/Admin/ads`.
  - **Announcements** → `/Admin/announcements` (broadcast to all roles).
- `/Admin/user-timeline` — additional admin screen (user activity/audit view), reached from within one of the management screens rather than the main menu.
- Admin screens are **not individually role-gated at the route level** in `_layout.jsx` — there's no route guard/middleware checking `role === "admin"` before rendering `/Admin/*`; access control relies entirely on (a) never surfacing a path to get there unless `getHomeRouteForRole` returned it, and (b) the backend rejecting admin-only API calls for non-admin tokens. **This is a client-side-only gate** — anyone who directly navigates to `/Admin` in the RN app would see the UI shell even without an admin token, though its data calls would fail server-side.

### Subscription / payment (role-agnostic, shared flow)
- `/SubscriptionPlans` — plan picker.
- `/payment.jsx` (native) / `/payment.web.jsx` (web) — platform-specific Razorpay checkout screens (Expo Router picks the right one per platform automatically via the `.web.jsx` extension convention).
- `/payment-pending` — polls `/auth/me` for `accountStatus`; routes home via `getHomeRouteForRole` once `"active"` (see `LOGIC_REFERENCE.md` §7).
- `PaymentRequiredGate` (component, not a route) — rendered in place of a dashboard when `paymentStatus === "payment_due"`; offers "Complete Payment" → `/SubscriptionPlans`, or "Log Out" (clears token/refreshToken/user, replaces to `/`).
- `TrialBanner`, `SubscriptionExpiredModal` — supporting UI for trial/subscription state, surfaced within dashboards rather than as routes.

### Misc / shared
- `/profile.jsx` — user profile (in `AUTH_ROUTES`, so no fullscreen ad).
- `/announcement/[id]` — single announcement detail.
- `/urgent-request-chat/[id]` — chat thread for urgent requests (shared between Medical Owner and Purchaser).

---

## 4. Contexts and cross-cutting wiring

### `SecurityContext` (`context/SecurityContext.jsx`)
- Provides `globalEnabled` (master kill-switch), `isRoleProtected(role)`, `logSecurityEvent`.
- `ROLE_PROTECTION_MAP`: `{ admin: true, medicalOwner: true, stockist: true, purchaser: true, staff: true }` — every known role currently gets screen-capture protection; unknown roles default to protected too.
- Must be the outermost provider (per the comment in `_layout.jsx`) so every screen can call `useSecurityConfig()` without prop drilling.

### `SecureScreen` (`components/SecureScreen.jsx`)
- Cross-platform screen-capture/recording prevention:
  - **Android**: `FLAG_SECURE` via `preventScreenCaptureAsync` — blacks out screenshots, recordings, and the recents thumbnail.
  - **iOS**: `preventScreenCaptureAsync` (blackout) + `enableAppSwitcherProtectionAsync` (blurs app-switcher/Siri/call snapshots) + an `AppState`-driven native `<Modal>` overlay shown on `background`/`inactive` (a real native Modal so it renders above any other transparent Modal already open, closing an overlay-escape hole).
  - **Web**: no capture-prevention API exists; instead it overlays on `visibilitychange`, window `blur`/`focus`, `pagehide`/`pageshow` (bfcache), and `beforeprint`/`afterprint` (blocks Print-to-PDF).
- Uses a module-level mount counter + generation number to correctly enable/disable the iOS app-switcher protection across multiple simultaneously-mounted `SecureScreen` instances without races.
- `/Admin` wraps its dashboard in `<SecureScreen>` directly (always protected). Other screens may instead use:

### `ProtectedRoute` (`components/ProtectedRoute.jsx`)
- Role-aware wrapper: reads `AsyncStorage["user"]`, resolves `role` (`user.role || user.userType || user.type`), calls `isRoleProtected(role)`, and toggles `SecureScreen`'s `enabled` prop accordingly. Defaults to protected (`enabled = true`) until role resolution completes, to avoid a flash of unprotected content. `forceEnabled` prop bypasses the role lookup entirely.

### API layer (`config/api.js`)
- `API_BASE_URL = "https://api.medi-trap.com"`, overridable via env vars (`API_URL`, `EXPO_PUBLIC_API_BASE_URL[_WEB|_NATIVE]`), with platform-specific base selection (web vs native) and localhost-rewriting helpers for local dev (rewrites `https://localhost` → `http://` outside production, and resolves `localhost` to the Expo dev host IP for physical devices).
- `apiUrl(path)` — normalizes any path to `{base}/api/{path}`, avoiding double `/api` prefixes.
- `fetchJson(path, options)` — the central authenticated request helper:
  - Attaches `Authorization: Bearer {token}` from `secureStorage` automatically.
  - On a `401` (and not already a retry), calls `tryRefreshAccessToken()` (POST `/api/auth/refresh` with the stored refresh token) and retries the original request once with the new token.
  - If refresh fails, clears `token`/`refreshToken`/`user` from storage (effectively logs the user out) and throws.
- `postForm(path, formData)` — multipart upload helper (images), 120s default timeout via `AbortController`.
- `postJson` — thin wrapper over `fetchJson` for JSON POST bodies.
- This file is the **single choke point** for all authenticated network calls across every role's screens, including all `/Admin/*` data fetches.

### Notifications (`app/utils/notifications.js`)
- `setNotificationChannel()` called once from `_layout.jsx` on mount — Android push notification channel setup, not role-specific.

---

## 5. Cross-role shared patterns worth reusing verbatim

- **"Middle" polling screens** (`purchasermiddle.jsx`, `MedicalMiddle.jsx`) share one shape: read pending-approval IDs from storage, poll a status endpoint every few seconds, clear the pending keys and redirect once approved, and keep polling silently through transient errors (404s during the wait are treated as "not yet ready," not failure).
- **Logout pattern** repeats near-identically in `payment-pending.jsx`, `PaymentRequiredGate.jsx`, and `AuthFlowScreen`'s trial-expired branch: clear `token` + `refreshToken` (+ sometimes `user`, `lastSubscription`) then `router.replace("/")`.
- **`getHomeRouteForRole` is the single routing authority** — reused by the login flow, the payment-pending poller, and implicitly relied upon by the Home screen's admin button (which just hardcodes `/Admin` rather than recomputing, since it already knows the user is admin).
