# Role-Based Navigation Logic — MediTrap (React Native)

Documentation only. No code in this project was modified to produce this file.
Roles covered: **Stockist**, **Purchaser**, **Medical Owner (Medical/Retailer)**, **Staff** (and **Admin**, which shares the same routing function though it has no role-select card).

---

## 1. Step-by-step flow

1. **App launch → Role Select screen** (`app/index.jsx`)
   - User sees 4 cards: Stockist, Medical Owner, Purchaser, Staff.
   - Tapping a card calls `handleRoleSelect(roleId)`:
     - Best-effort writes `AsyncStorage["selectedRole"] = roleId` (failure ignored, never blocks navigation).
     - Routes to that role's login screen:
       - `Purchaser` → `/Purchaser/purchaser-login`
       - `Stockist` → `/Stockist/stockist-login`
       - `Medical Owner` → `/login`
       - `Staff` → `/Staff/staff-login`

2. **Role login screen** (`app/login.jsx`, `app/Purchaser/purchaser-login.jsx`, `app/Stockist/stockist-login.jsx`, `app/Staff/staff-login.jsx`)
   - Each is a thin wrapper that renders the shared `<AuthFlowScreen role="..." .../>` component with a fixed `role` prop (`"medicalOwner"`, `"purchaser"`, `"stockist"`, `"staff"`) plus cosmetic props (colors, logo, signup route). **All actual logic lives in `AuthFlowScreen`.**

3. **Login submit** (`components/auth/AuthFlowScreen.jsx` → `handlePasswordLogin`)
   - Validates `identifier` + `password` are non-empty (else inline error, no request sent).
   - Calls `authenticateWithPassword({ identifier, password, role })` (`services/authService.js`).
   - **Success path** (`data.success !== false`): saves "remember me" identifier if checked, then calls `applyAuthResult(data)`.
   - **Soft-fail path** (`data.success === false`): checks `applyTrialExpiredIfNeeded` — if the payload still carries an `accessToken`, treats it as **trial-expired / payment-required**, not a real login failure (see §4). Otherwise throws and shows the error message.
   - **Hard-fail path** (thrown/network error): if the error has a `.body` with an access token, same trial-expired handling applies; otherwise shows `err.message` or a generic failure string.

4. **`applyAuthResult(data)` — the core redirect logic**
   - Extracts `{ accessToken, refreshToken, user }` from the response (tries several response shapes: `data.token`, `data.accessToken`, `data.data.token`, `data.user`, `data.purchaser`, `data.profile`, etc. — backend shape isn't fully standardized).
   - Persists auth state via `persistAuthState()` (see §5) and separately writes the token to `secureStorage`.
   - **Stockist-only gate:** if `role === "stockist"` and the user is not approved (`user.approved !== true` and `user.status` not `"approved"`/`"Approved"`), stores `pendingStockistId` and redirects to `/Stockist/stockist-verification` — **stops here**, does not reach normal role routing.
   - **Normal routing:** the destination role is `user.role` from the backend (falls back to the requested `role` prop if the backend didn't return one) — the backend's `user.role` is the single source of truth, not what screen the user logged in from.
   - Calls `getHomeRouteForRole(dbRole, uid)` to compute destination, then `router.replace(destination)` (replace, not push — user can't back-navigate to the login screen).
   - In `__DEV__` only, logs `{ requestedRole, returnedRole, dbRole, uid, destination, user }` for debugging role mismatches.

5. **`getHomeRouteForRole(role, userId)`** (`utils/getHomeRouteForRole.js`) — pure function, single source of truth for role → route mapping.
   - Normalizes role: lowercase, trim, strip all non-alphanumeric chars (`"Medical Owner"` → `"medicalowner"`).
   - Roles mapped to `/Home` (a shared home screen): `medicalowner`, `medicalretailer`, `retailer`, `medical`, `user`.
   - Roles with dedicated/dynamic routes:
     - `purchaser` → `/Purchaser/{userId}`
     - `stockist` → `/Stockist/stockist-dashboard`
     - `staff` → `/Staff/{userId}`
     - `admin` → `/Admin`
   - Unrecognized role → logs a warning, falls back to `/` (role-select screen).

6. **Trial-expired / payment-required flow** (side branch, not a redirect)
   - Triggered when backend responds `success: false` (or non-2xx) but still includes an `accessToken` — this specific combination is the documented signal for "payment required," regardless of message text (message text is explicitly treated as unreliable/non-enum).
   - Auth state (including token) is persisted immediately, so the user is already "logged in" for subsequent authenticated calls even though they haven't reached a home screen.
   - Sets `trialExpired = true`, stores `accountStatus` from the response, shows a payment modal (rendered by `LoginForm`).
   - "Pay Now" / "Check Status" button (`handleGoToPayment`):
     - If `accountStatus === "pending_admin_verification"` → `/payment-pending` (payment already made, awaiting admin approval).
     - Otherwise → `/SubscriptionPlans` (pick a plan and pay).
   - Closing the modal: `router.back()` if possible, else `router.replace("/")`.

7. **`/payment-pending` screen** (`app/payment-pending.jsx`)
   - Polls `GET /auth/me` every 6 seconds (immediate first check, paused while app is backgrounded, resumed on foreground via `AppState` listener).
   - `accountStatus === "active"` → stop polling, show "Account Activated" for 1.8s, then `getHomeRouteForRole(user.role, user._id)` → `router.replace(dest)`. Same routing function as the main login flow — guarantees consistent destination regardless of entry path.
   - `accountStatus === "rejected"` → stop polling, show rejection screen with a "Back to Home" button that clears all stored auth (`token`, `refreshToken`, `user`, `lastSubscription`) and replaces to `/`.
   - Network errors during polling are silently swallowed (keep polling, no user-facing error).

8. **Stockist verification gate** (`/Stockist/stockist-verification`, referenced but not detailed further here since it's outside the direct routing chain — reached only when a stockist logs in unapproved; not part of `getHomeRouteForRole`).

---

## 2. Key files and their roles

| File | Responsibility |
|---|---|
| `app/index.jsx` | Role-select landing screen; routes to the correct login screen per role. |
| `app/login.jsx` | Medical Owner login — wraps `AuthFlowScreen` with `role="medicalOwner"`. |
| `app/Purchaser/purchaser-login.jsx` | Purchaser login — wraps `AuthFlowScreen` with `role="purchaser"`. |
| `app/Stockist/stockist-login.jsx` | Stockist login — wraps `AuthFlowScreen` with `role="stockist"`. |
| `app/Staff/staff-login.jsx` | Staff login — wraps `AuthFlowScreen` with `role="staff"`. |
| `components/auth/AuthFlowScreen.jsx` | **All shared login logic**: form submit, auth-payload extraction, stockist-approval gate, trial-expired handling, calling the routing function, final redirect. |
| `services/authService.js` | `authenticateWithPassword()` — POSTs to backend with multiple payload/endpoint fallbacks (backend field-name variance); `persistAuthState()` — writes token/refreshToken/user/role to storage. |
| `utils/getHomeRouteForRole.js` | Pure role → route mapping. **Single source of truth** — used by both the login flow and the payment-pending poller. |
| `utils/secureStore.js` | Secure (encrypted) storage wrapper for `token`/`refreshToken`. |
| `app/payment-pending.jsx` | Polls account activation status post trial-expiry payment; redirects via the same `getHomeRouteForRole` once active. |

---

## 3. State / storage tracked

| Storage | Location | Key | Purpose |
|---|---|---|---|
| React state | `AuthFlowScreen` | `identifier`, `password`, `showPassword`, `rememberMe` | Form inputs. |
| React state | `AuthFlowScreen` | `error`, `loading` | Request status/feedback. |
| React state | `AuthFlowScreen` | `trialExpired`, `blockedAccountStatus` | Drives the payment-required modal and which CTA it shows. |
| `secureStorage` (encrypted) | `authService.persistAuthState`, `AuthFlowScreen` | `token`, `refreshToken` | Auth credentials used for authenticated API calls. |
| `AsyncStorage` | `authService.persistAuthState` | `user` (JSON), `role` | Cached user profile / requested role. |
| `AsyncStorage` | `AuthFlowScreen` | `rememberedIdentifier`, `remembered{Role}Identifier` | Remember-me autofill, keyed per role so switching roles doesn't clobber another role's saved identifier. |
| `AsyncStorage` | `AuthFlowScreen` | `pendingStockistId` | Set when an unapproved stockist logs in; used by the verification screen. |
| `AsyncStorage` | `app/index.jsx` | `selectedRole` | Best-effort record of last picked role (failure ignored). |
| `secureStorage` | `payment-pending.jsx` | `lastSubscription` (JSON) | Cached plan info for display while awaiting activation; cleared on rejection logout. |

---

## 4. Conditions, validations, edge cases

- **Empty credentials**: blocked client-side before any request (`"Please enter your credentials to continue."`).
- **Backend field-name uncertainty**: both the request payload (`buildIdentifierPayloads`) and response parsing (`extractAuthPayload`) try multiple shapes/aliases — the backend contract isn't fully fixed, so the client is defensive on both ends.
- **404/405 on an endpoint candidate**: treated as "wrong endpoint," falls through to the next candidate/endpoint in `requestWithFallback` rather than failing.
- **`Failed to fetch` (network-level)**: also falls through to next payload variant.
- **Any other non-2xx**: thrown immediately as a real error, but with `err.body` preserved so trial-expired detection can still run on it.
- **Trial-expired detection rule**: `success: false` (or thrown error) + response still contains an `accessToken` = payment-required, NOT a login failure. Explicitly does not pattern-match on message text since it isn't a stable enum.
- **Stockist approval gate**: unapproved stockist is diverted to verification instead of the dashboard, checked via `user.approved === true` OR `user.status` in `{"approved","Approved"}` (tolerates two different backend conventions).
- **Role source of truth**: destination is computed from `user.role` returned by the backend, not the `role` the user clicked into at login — a mismatch between requested/returned role is logged in dev builds but does not block navigation.
- **Unrecognized role**: `getHomeRouteForRole` warns and returns `/` (back to role-select) rather than throwing.
- **`pending_admin_verification` account status**: routes the "make payment" CTA to `/payment-pending` instead of `/SubscriptionPlans`, to avoid a duplicate charge for a payment already made.
- **Payment-pending polling**: paused when app backgrounds, resumed on foreground; network errors while polling are swallowed silently (no user-facing error, just keeps trying).
- **Navigation uses `router.replace`, not `push`**, for the post-login redirect and the pending→home transition, so the user cannot navigate back into the login/pending screen with the hardware/gesture back action.

---

## 5. API endpoints / data sources

- `POST /api/auth/login`, `POST /api/auth/login/{role}` — generic login (tried in order for non-purchaser roles).
- `POST /api/auth/login`, `POST /purchaser/login`, `POST /api/auth/purchaser/login` — purchaser login candidates.
- `GET /auth/me` — polled from `/payment-pending` to check `accountStatus`.
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/:token` — not part of role routing but live in the same service file.

Expected response fields (best-effort, multiple aliases tolerated): `accessToken`/`token`/`access_token` (root or nested under `data`), `refreshToken`/`refresh_token`, `user`/`purchaser`/`profile` object containing at least `role`/`.role` and `_id`/`.id`, optionally `approved`/`status`, `accountStatus`, `message`.
