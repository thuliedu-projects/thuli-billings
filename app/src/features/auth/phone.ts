/** Indian mobile as E.164, or null when it is not 10 digits. */
export function toIndiaPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const local =
    digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits.slice(-10);
  if (local.length !== 10) return null;
  return `+91${local}`;
}
