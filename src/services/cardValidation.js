export function validateDemoCard(card, now = new Date()) {
  const number = String(card.cardNumber || "").replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(number)) return "Enter a valid card number.";

  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = Number(number[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  if (sum % 10 !== 0) return "Check the card number.";

  if (!String(card.cardHolder || "").trim()) return "Enter the cardholder name.";

  const month = Number(card.expiryMonth);
  const year = Number(card.expiryYear);
  if (!Number.isInteger(month) || month < 1 || month > 12) return "Select a valid expiry month.";
  if (!Number.isInteger(year) || year < now.getFullYear() || year > now.getFullYear() + 20) return "Use a valid expiry year.";

  const expiryDate = new Date(year, month, 0, 23, 59, 59, 999);
  if (expiryDate < now) return "Enter a valid, unexpired expiry date.";

  const cvv = String(card.cvv || "").trim();
  const isAmex = /^3[47]/.test(number);
  if (isAmex ? !/^\d{4}$/.test(cvv) : !/^\d{3}$/.test(cvv)) return "Enter the correct CVV (3 digits, or 4 for Amex).";

  return "";
}
