export function validateDemoCard(card, now = new Date()) {
  const number = String(card.cardNumber || "").replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(number)) return "Enter a valid card number.";
  let sum = 0, double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = Number(number[i]);
    if (double) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit; double = !double;
  }
  if (sum % 10) return "Check the card number.";
  if (!String(card.cardHolder || "").trim()) return "Enter the cardholder name.";
  const month = Number(card.expiryMonth), year = Number(card.expiryYear);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year > now.getFullYear() + 20 || new Date(year, month, 1) <= now) return "Enter a valid, unexpired expiry date.";
  if (!(number.startsWith("34") || number.startsWith("37") ? /^\d{4}$/ : /^\d{3}$/).test(String(card.cvv || ""))) return "Enter the correct CVV (3 digits, or 4 for Amex).";
  if (!["4242424242424242", "4111111111111111", "5555555555554444", "378282246310005"].includes(number)) return "This is a demo. Use test card 4242 4242 4242 4242, not a real card.";
  return "";
}
