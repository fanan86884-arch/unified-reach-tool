// Utilities for Egyptian phone numbers (supports Arabic numerals)

const ARABIC_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];

export const toEnglishDigits = (input: string): string => {
  let out = input;
  ARABIC_DIGITS.forEach((d, i) => {
    out = out.replace(new RegExp(d, 'g'), String(i));
  });
  return out;
};

/**
 * Normalizes to an Egyptian local mobile format: 01XXXXXXXXX (11 digits) when possible.
 * - Strips non-digits
 * - Supports inputs like: +20 10..., 2010..., 010..., 10...
 */
export const normalizeEgyptPhoneDigits = (input: string): string => {
  const digits = toEnglishDigits(input).replace(/\D/g, '');
  if (!digits) return '';

  // Remove leading 00 (international prefix)
  let d = digits.startsWith('00') ? digits.slice(2) : digits;

  // Remove country code 20 if present
  if (d.startsWith('20')) d = d.slice(2);

  // If number starts with 0 already, keep it
  if (d.startsWith('0')) {
    return d.length === 11 ? d : d;
  }

  // If starts with 1 and looks like an Egyptian mobile (10 digits), add leading 0
  if (d.length === 10 && d.startsWith('1')) {
    return `0${d}`;
  }

  // Fallback: return as-is digits
  return d;
};

/** Returns Egypt E.164 digits without + (e.g. 2010xxxxxxxx) */
export const toEgyptE164Digits = (input: string): string => {
  const local = normalizeEgyptPhoneDigits(input);
  if (!local) return '';

  // Prefer local mobile with leading 0 => remove it and prefix 20
  if (local.startsWith('0')) {
    const withoutZero = local.slice(1);
    if (!withoutZero) return '';
    return `20${withoutZero}`;
  }

  // Already without leading zero
  if (local.startsWith('1')) {
    return `20${local}`;
  }

  // Unknown shape
  return local.startsWith('20') ? local : `20${local}`;
};

export const buildWhatsAppLink = (phone: string): string => {
  const e164 = toEgyptE164Digits(phone);
  if (!e164) return '';
  return `https://wa.me/${e164}`;
};

export const buildCallLink = (phone: string): string => {
  const e164 = toEgyptE164Digits(phone);
  if (!e164) return '';
  return `tel:+${e164}`;
};
