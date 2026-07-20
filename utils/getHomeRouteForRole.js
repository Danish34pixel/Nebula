/**
 * Returns the home route for a given DB role.
 * userId required for roles with dynamic paths (purchaser, staff).
 */
export function getHomeRouteForRole(role, userId) {
  const normalizedRole = String(role || "")
    .trim()
    .toLowerCase();

  const normalizedRoleKey = normalizedRole.replace(/[^a-z0-9]+/g, "");

  const homeRoles = new Set([
    "medicalowner",
    "medicalretailer",
    "retailer",
    "medical",
    "user",
  ]);

  if (homeRoles.has(normalizedRoleKey)) {
    return "/Home";
  }

  switch (normalizedRoleKey) {
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
