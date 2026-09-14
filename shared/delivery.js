// Subtotals are in cents so the R500 boundary is exact.
export function deliveryFee(subtotalCents, normalFee) {
  return subtotalCents > 50000 ? 0 : normalFee;
}
