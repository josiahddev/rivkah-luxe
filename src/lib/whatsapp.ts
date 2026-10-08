/** Build a wa.me link from a number in any common Nigerian format (0803…, +234 803…, 234803…). */
export function whatsappLink(number: string, message?: string) {
  let digits = number.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) digits = `234${digits.slice(1)}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}
