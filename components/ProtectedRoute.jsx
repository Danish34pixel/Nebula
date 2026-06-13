import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSecurityConfig } from "../context/SecurityContext";
import SecureScreen from "./SecureScreen";

// ─────────────────────────────────────────────────────────────────────────────
// ProtectedRoute
//
// Role-aware wrapper that reads the current user's role from AsyncStorage,
// checks it against ROLE_PROTECTION_MAP in SecurityContext, and enables or
// disables SecureScreen accordingly.
//
// Use this INSTEAD of SecureScreen when the protection level should depend
// on who is logged in (e.g. a screen that is only sensitive for certain roles).
// For screens that are always sensitive regardless of role, SecureScreen
// with default props is sufficient.
//
// Usage:
//   return (
//     <ProtectedRoute>
//       <SafeAreaView>…</SafeAreaView>
//     </ProtectedRoute>
//   );
//
// Props:
//   forceEnabled  boolean  override the role check and always protect
//   style         object   passed through to SecureScreen's root container
// ─────────────────────────────────────────────────────────────────────────────
export default function ProtectedRoute({ children, style, forceEnabled }) {
  const { isRoleProtected, globalEnabled } = useSecurityConfig();

  // Default to true (protect) until the role is resolved from storage.
  // This prevents a flash of unprotected content on mount.
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (forceEnabled !== undefined) {
      setEnabled(forceEnabled && globalEnabled);
      return;
    }

    // Read the stored user object and resolve protection from their role.
    AsyncStorage.getItem("user")
      .then((json) => {
        if (!json) {
          // No user in storage — no sensitive data to protect
          setEnabled(false);
          return;
        }
        const user = JSON.parse(json);
        // Role field naming varies across roles in this codebase
        const role =
          user?.role ||
          user?.userType ||
          user?.type ||
          "";
        setEnabled(isRoleProtected(role));
      })
      .catch(() => {
        // On parse error, default to protected
        setEnabled(true);
      });
  }, [isRoleProtected, globalEnabled, forceEnabled]);

  return (
    <SecureScreen enabled={enabled} style={style}>
      {children}
    </SecureScreen>
  );
}
