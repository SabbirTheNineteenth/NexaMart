export function normalizeTelegramContactPhone(value: string): string | null {
  const phone = value.trim();
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}
