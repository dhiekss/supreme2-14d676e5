export function canReadPjjReport(ownerId: string, userId: string, roles: readonly string[], recap: boolean) {
  return ownerId === userId || (recap && roles.some((role) => role === "admin" || role === "superadmin"));
}

export function scopePjjQuery<T extends { eq: (column: string, value: string) => T }>(query: T, userId: string, roles: readonly string[], recap: boolean): T {
  return canReadPjjReport("other-owner", userId, roles, recap) ? query : query.eq("created_by", userId);
}