import type { AuditDatabase, AuditListFilters, AuditMetadata, AuditRecordInput, AuditRepository } from "../audit.repository.js";

const sensitiveKey = /(?:pass(?:word)?|secret|token|authorization|cookie|api[_-]?key|credential)/i;

function sanitizeMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeMetadata);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !sensitiveKey.test(key))
      .map(([key, nestedValue]) => [key, sanitizeMetadata(nestedValue)]));
  }
  return value;
}

export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  record(input: AuditRecordInput, database?: AuditDatabase) {
    return this.repository.append({ ...input, metadata: sanitizeMetadata(input.metadata) as AuditMetadata }, database);
  }

  list(filters: AuditListFilters) {
    return this.repository.list(filters);
  }
}
