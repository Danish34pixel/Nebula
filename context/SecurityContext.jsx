import { createContext, useCallback, useContext, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// ROLE PROTECTION MAP
// Set a role to false to opt it out of screen-capture protection globally.
// Add new roles here as the platform grows.
// ─────────────────────────────────────────────────────────────────────────────
export const ROLE_PROTECTION_MAP = {
  admin: true,
  medicalOwner: true,
  stockist: true,
  purchaser: true,
  staff: true,
  // guest: false,   // unauthenticated users see no sensitive data
};

// Default context shape — used when a component is rendered outside
// SecurityProvider. Defaults to "protect everything" so new screens are
// safe before an explicit decision is made.
const SecurityContext = createContext({
  globalEnabled: true,
  setGlobalEnabled: () => {},
  isRoleProtected: (_role) => true,
  logSecurityEvent: (_event, _details) => {},
});

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// Place <SecurityProvider> at the root of the app (app/_layout.jsx) so every
// screen can read protection state without prop drilling.
// ─────────────────────────────────────────────────────────────────────────────
export function SecurityProvider({ children }) {
  // Master kill-switch: set false in dev/testing to disable all overlays
  // without modifying individual screens.
  const [globalEnabled, setGlobalEnabled] = useState(true);

  // Returns true when the given role requires capture protection.
  // Unknown roles default to true (protect by default).
  const isRoleProtected = useCallback(
    (role) => {
      if (!globalEnabled) return false;
      if (role && Object.prototype.hasOwnProperty.call(ROLE_PROTECTION_MAP, role)) {
        return ROLE_PROTECTION_MAP[role];
      }
      return true;
    },
    [globalEnabled]
  );

  // Security event logger — compiled out in production builds (__DEV__ = false).
  // Use this to build an audit trail of capture attempts during development.
  const logSecurityEvent = useCallback((event, details = {}) => {
    if (__DEV__) {
      const ts = new Date().toISOString();
      // eslint-disable-next-line no-console
      console.log(`[SECURITY ${ts}] ${event}`, details);
    }
  }, []);

  return (
    <SecurityContext.Provider
      value={{ globalEnabled, setGlobalEnabled, isRoleProtected, logSecurityEvent }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────
export function useSecurityConfig() {
  return useContext(SecurityContext);
}
