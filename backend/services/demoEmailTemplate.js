const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function generateDemoOrderEmail(order) {
  const money = (value) => `R${Number(value).toFixed(2)}`;
  return `<div style="font-family:Arial,sans-serif;color:#351536;padding:24px;max-width:600px">
    <h1>SafeHer demo order confirmation</h1>
    <p><strong>No payment was charged. This is a demonstration order, not a payment receipt.</strong></p>
    <p>Hello ${escape(order.customerName)},</p>
    <p>Your demo order <strong>${escape(order.orderNumber)}</strong> was created successfully.</p>
    <ul>${order.items.map((item) => `<li>${escape(item.name)} &times; ${escape(item.quantity)} - ${money(item.price * item.quantity)}</li>`).join("")}</ul>
    <p>Demo delivery fee: ${money(order.deliveryFee)}<br>Demo total: <strong>${money(order.total)}</strong></p>
    <p>No stock has been reserved and no delivery will take place.</p>
    <p>You can view this demo order in your SafeHer order history.</p>
  </div>`;
}
