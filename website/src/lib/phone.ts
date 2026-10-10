/** Indian mobile as E.164, or null when it is not 10 digits starting 6–9. */
export function toIndiaPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits.slice(-10);
  if (!/^[6-9]\d{9}$/.test(local)) return null;
  return `+91${local}`;
}

export function formatIndiaPhone(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return raw ? raw : '';
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}
