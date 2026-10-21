export const ROLES = [
  "superadmin", "admin", "wakasek", "kakonli", "walas", "guru", "murid",
  "tendik", "staff_kurikulum", "admin_sarpras", "admin_persuratan", "admin_tpg",
] as const;

export type Role = (typeof ROLES)[number];

const ROLE_PRIORITY: readonly Role[] = [
  "superadmin", "admin", "wakasek", "kakonli", "walas",
  "admin_persuratan", "admin_sarpras", "admin_tpg", "staff_kurikulum",
  "tendik", "guru", "murid",
];

export function getPrimaryRole(roles: readonly string[]): Role | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}