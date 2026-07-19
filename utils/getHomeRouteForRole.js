/**
 * Returns the home route for a given DB role.
 * userId required for roles with dynamic paths (purchaser, staff).
 */
export function getHomeRouteForRole(role, userId) {
  switch (role) {
    case "medical_owner":
    case "user":
      return "/Home";
    case "purchaser":
      return `/Purchaser/${userId}`;
    case "stockist":
      return "/Stockist/stockist-dashboard";
    case "staff":
      return `/Staff/${userId}`;
    case "admin":
      return "/Admin";
    default:
      console.warn("[getHomeRouteForRole] unrecognized role:", role);
      return "/";
  }
}
