/**
 * Email Templates for SafeHer
 * 
 * Professional HTML email templates branded for SafeHer
 */

/**
 * Format currency value to South African Rand
 * @param {number} value - Amount to format
 * @returns {string} - Formatted string like "R1,234.56"
 */
function formatCurrency(value) {
	return `R${parseFloat(value).toLocaleString('en-ZA', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

/**
 * Format date to readable format
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date like "7 September 2026"
 */
function formatDate(date) {
	return new Date(date).toLocaleDateString('en-ZA', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

/**
 * Generate order confirmation email HTML
 * @param {object} order - Order object with items, user, etc.
 * @returns {string} - HTML email content
 */
export function generateOrderConfirmationEmail(order) {
	const {
		orderNumber,
		items = [],
		subtotal = 0,
		deliveryFee = 0,
		total = 0,
		customerName,
		customerEmail,
		deliveryAddress,
		deliveryMethod,
		paymentStatus,
		createdAt,
	} = order;

	// Calculate subtotal from items if not provided
	let calculatedSubtotal = subtotal;
	if (!subtotal && items.length) {
		calculatedSubtotal = items.reduce(
			(sum, item) => sum + (item.price * item.quantity),
			0
		);
	}

	const html = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>SafeHer Order Confirmation</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			background-color: #f9f7fb;
			line-height: 1.6;
			color: #5a4d5c;
		}
		.container {
			max-width: 600px;
			margin: 0 auto;
			background-color: #ffffff;
		}
		.header {
			background: linear-gradient(135deg, #351536 0%, #5d4260 100%);
			padding: 40px 20px;
			text-align: center;
			color: #ffffff;
		}
		.logo {
			font-size: 28px;
			font-weight: 700;
			letter-spacing: 0.05em;
			margin-bottom: 8px;
		}
		.tagline {
			font-size: 13px;
			opacity: 0.9;
			letter-spacing: 0.05em;
		}
		.content {
			padding: 40px 20px;
		}
		.greeting {
			font-size: 16px;
			font-weight: 600;
			color: #351536;
			margin-bottom: 8px;
		}
		.intro-text {
			font-size: 14px;
			color: #5a4d5c;
			margin-bottom: 28px;
			line-height: 1.6;
		}
		.order-status {
			background: linear-gradient(135deg, #f3fbf7 0%, #e8f5f0 100%);
			border: 1px solid #d7f0df;
			border-radius: 12px;
			padding: 16px;
			margin-bottom: 28px;
			text-align: center;
		}
		.status-badge {
			display: inline-block;
			background-color: #1d5c3d;
			color: #ffffff;
			padding: 8px 16px;
			border-radius: 24px;
			font-size: 13px;
			font-weight: 600;
			letter-spacing: 0.05em;
		}
		.section-title {
			font-size: 13px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.08em;
			color: #351536;
			margin-top: 24px;
			margin-bottom: 12px;
			padding-bottom: 8px;
			border-bottom: 2px solid #ecd9ef;
		}
		.order-meta {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 16px;
			margin-bottom: 24px;
			font-size: 13px;
		}
		.meta-item {
			display: flex;
			flex-direction: column;
		}
		.meta-label {
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.06em;
			color: #756d76;
			margin-bottom: 4px;
		}
		.meta-value {
			font-weight: 600;
			color: #351536;
			font-size: 14px;
		}
		.products-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 20px;
		}
		.products-table th {
			text-align: left;
			font-size: 12px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.06em;
			color: #756d76;
			padding: 12px 8px;
			border-bottom: 1px solid #ecd9ef;
		}
		.products-table td {
			padding: 12px 8px;
			border-bottom: 1px solid #ecd9ef;
			font-size: 13px;
		}
		.product-name {
			font-weight: 600;
			color: #351536;
		}
		.product-quantity {
			text-align: center;
			color: #5a4d5c;
		}
		.product-price {
			text-align: right;
			color: #5a4d5c;
			font-weight: 600;
		}
		.summary-table {
			width: 100%;
			margin-top: 16px;
			font-size: 13px;
		}
		.summary-row {
			display: flex;
			justify-content: space-between;
			padding: 8px 0;
			border-bottom: 1px solid #ecd9ef;
		}
		.summary-row.total {
			border-bottom: 2px solid #ecd9ef;
			padding: 12px 0;
			font-size: 18px;
			font-weight: 700;
			color: #351536;
		}
		.summary-label {
			color: #5a4d5c;
		}
		.summary-value {
			color: #351536;
			font-weight: 600;
		}
		.delivery-section {
			background-color: #f9f4fb;
			border: 1px solid #ecd9ef;
			border-radius: 12px;
			padding: 16px;
			margin-top: 24px;
		}
		.delivery-label {
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.06em;
			color: #756d76;
			margin-bottom: 8px;
		}
		.delivery-address {
			font-size: 14px;
			color: #351536;
			line-height: 1.6;
		}
		.next-steps {
			background-color: #fdf3e2;
			border: 1px solid #f0d9a8;
			border-radius: 12px;
			padding: 16px;
			margin-top: 24px;
			font-size: 13px;
			color: #5a4d5c;
		}
		.next-steps-title {
			font-weight: 600;
			color: #8a5a12;
			margin-bottom: 8px;
		}
		.next-steps-list {
			margin-left: 20px;
		}
		.next-steps-list li {
			margin-bottom: 6px;
			line-height: 1.5;
		}
		.footer {
			background-color: #f9f7fb;
			padding: 24px 20px;
			border-top: 1px solid #ecd9ef;
			font-size: 12px;
			color: #756d76;
			text-align: center;
		}
		.footer-message {
			margin-bottom: 12px;
			line-height: 1.6;
		}
		.support-info {
			font-size: 11px;
			color: #9a8d9e;
			margin-top: 12px;
		}
		.divider {
			height: 1px;
			background-color: #ecd9ef;
			margin: 20px 0;
		}
		.button {
			display: inline-block;
			background-color: #351536;
			color: #ffffff;
			padding: 12px 24px;
			border-radius: 8px;
			text-decoration: none;
			font-weight: 600;
			font-size: 13px;
			margin-top: 16px;
		}
	</style>
</head>
<body>
	<div class="container">
		<!-- Header -->
		<div class="header">
			<div class="logo">SafeHer</div>
			<div class="tagline">Stay Safe. Stay Connected.</div>
		</div>

		<!-- Content -->
		<div class="content">
			<!-- Greeting -->
			<div class="greeting">Hi ${customerName || 'Valued Customer'},</div>
			<div class="intro-text">
				Thank you for shopping with SafeHer. Your order has been successfully received and we're getting it ready for dispatch.
			</div>

			<!-- Order Status -->
			<div class="order-status">
				<div style="font-size: 12px; color: #5a4d5c; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.06em;">Order Status</div>
				<div class="status-badge">✓ Confirmed</div>
			</div>

			<!-- Order Details -->
			<div class="section-title">Order Details</div>
			<div class="order-meta">
				<div class="meta-item">
					<div class="meta-label">Order Number</div>
					<div class="meta-value">${orderNumber}</div>
				</div>
				<div class="meta-item">
					<div class="meta-label">Order Date</div>
					<div class="meta-value">${formatDate(createdAt)}</div>
				</div>
				<div class="meta-item">
					<div class="meta-label">Payment Status</div>
					<div class="meta-value">${paymentStatus ? paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1) : 'Pending'}</div>
				</div>
				<div class="meta-item">
					<div class="meta-label">Delivery Method</div>
					<div class="meta-value">${deliveryMethod || 'Standard'}</div>
				</div>
			</div>

			<!-- Products -->
			<div class="section-title">Order Summary</div>
			<table class="products-table">
				<thead>
					<tr>
						<th>Product</th>
						<th class="product-quantity">Qty</th>
						<th class="product-price">Price</th>
					</tr>
				</thead>
				<tbody>
					${items
						.map(
							(item) => `
					<tr>
						<td class="product-name">${item.name || 'Unknown Product'}</td>
						<td class="product-quantity">${item.quantity}</td>
						<td class="product-price">${formatCurrency(item.price)}</td>
					</tr>
					`
						)
						.join('')}
				</tbody>
			</table>

			<!-- Order Totals -->
			<div class="summary-table">
				<div class="summary-row">
					<span class="summary-label">Subtotal</span>
					<span class="summary-value">${formatCurrency(calculatedSubtotal)}</span>
				</div>
				${deliveryFee > 0 ? `
				<div class="summary-row">
					<span class="summary-label">Delivery Fee</span>
					<span class="summary-value">${formatCurrency(deliveryFee)}</span>
				</div>
				` : ''}
				<div class="summary-row total">
					<span>Total</span>
					<span>${formatCurrency(total)}</span>
				</div>
			</div>

			<!-- Delivery Address -->
			<div class="delivery-section">
				<div class="delivery-label">Delivery Address</div>
				<div class="delivery-address">${deliveryAddress || 'Not specified'}</div>
			</div>

			<!-- Next Steps -->
			<div class="next-steps">
				<div class="next-steps-title">What Happens Next</div>
				<ul class="next-steps-list">
					<li>We'll confirm your payment and begin packing your order</li>
					<li>You'll receive a shipping confirmation with tracking details</li>
					<li>Your order will be dispatched within 24-48 hours</li>
					<li>Track your delivery status anytime in your SafeHer account</li>
				</ul>
			</div>
		</div>

		<!-- Footer -->
		<div class="footer">
			<div class="footer-message">
				Thank you for choosing SafeHer. We're committed to your safety and security.
			</div>
			<div style="margin-top: 16px; font-style: italic; color: #351536; font-weight: 600;">
				Stay safe. Stay connected.
			</div>
			<div class="support-info">
				Questions? Contact our support team at support@safeher.co.za or visit www.safeher.co.za<br>
				© ${new Date().getFullYear()} SafeHer. All rights reserved.
			</div>
		</div>
	</div>
</body>
</html>
	`;

	return html;
}

export default {
	generateOrderConfirmationEmail,
	formatCurrency,
	formatDate,
};
