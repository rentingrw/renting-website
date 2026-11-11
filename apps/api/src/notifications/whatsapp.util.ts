/** Digits only, no +, for Meta WhatsApp Cloud API `to` field. */
export function whatsappRecipientDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) return null;
  if (digits.startsWith('250')) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `250${digits.slice(1)}`;
  if (digits.length === 9) return `250${digits}`;
  return digits;
}

export function parseAdminWhatsAppRecipients(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\s]+/)
    .map((part) => whatsappRecipientDigits(part.trim()))
    .filter((value): value is string => Boolean(value));
}

export function buildWhatsAppClickToChatUrl(phone: string, text: string): string | null {
  const digits = whatsappRecipientDigits(phone);
  if (!digits) return null;
  const body = text.trim().slice(0, 1500);
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}
