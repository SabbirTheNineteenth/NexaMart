export type AuditRecordFilters = {
  action?: string;
  resourceType?: string;
  limit?: string;
};

export function auditRecordsPath(filters: AuditRecordFilters): string {
  const parameters = new URLSearchParams();
  const action = filters.action?.trim();
  const resourceType = filters.resourceType?.trim();
  const limit = filters.limit?.trim();

  if (action) parameters.set("action", action);
  if (resourceType) parameters.set("resourceType", resourceType);
  if (limit) parameters.set("limit", limit);

  const query = parameters.toString();
  return query ? `/admin/audit-records?${query}` : "/admin/audit-records";
}

export function auditMetadataText(metadata: Record<string, unknown>): string {
  try {
    return JSON.stringify(metadata) ?? "{}";
  } catch {
    return "Metadata unavailable";
  }
}
