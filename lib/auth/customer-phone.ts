export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function customerLoginEmail(phone: string) {
  return `${phoneDigits(phone)}@bloom.local`;
}

export function customerPasswords(phone: string) {
  const digits = phoneDigits(phone);
  return [...new Set([digits.slice(-6), digits.slice(-4)].filter((password) => password.length >= 4))];
}

/** Convierte números argentinos ingresados local o internacionalmente a E.164. */
export function argentinaE164(phone: string) {
  let digits = phoneDigits(phone);
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("549")) return `+${digits}`;
  if (digits.startsWith("54")) return `+549${digits.slice(2)}`;
  return `+549${digits}`;
}

export function uniquePhoneVariants(...values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => phoneDigits(value ?? "")).filter(Boolean))];
}
