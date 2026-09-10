import pool from '../config/db.js';
import { generateDemoOrderEmail } from '../services/demoEmailTemplate.js';
import emailService from '../services/emailService.js';
import { generateOrderConfirmationEmail } from '../services/emailTemplates.js';
import { generatePdfReceipt, generateReceiptFilename } from '../services/pdfReceiptGenerator.js';

/**
 * Order Email Service
 * Handles sending order confirmation emails with PDF receipts
 */

/**
 * Send order confirmation email with PDF receipt
 * 
 * This function:
 * 1. Verifies the order exists and loads complete details
 * 2. Generates the HTML email content
 * 3. Generates a PDF receipt
 * 4. Sends the email with the PDF attachment
 * 5. Updates the database to mark email as sent
 * 6. Logs any errors without failing the order
 * 
 * IMPORTANT: This function does NOT fail even if email sending fails.
 * The order remains confirmed, but the error is logged for retry.
 * 
 * @param {number} orderId - Database order ID
 * @param {number} userId - Database user ID
 * @param {string} customerEmail - Customer email address
 * @returns {Promise<object>} - Result object: { success, emailSent, error }
 */
export async function sendOrderConfirmationEmail(orderId, userId, customerEmail) {
	let connection;

	try {
		connection = await pool.getConnection();
		// Step 1: Fetch complete order details
		const [orders] = await connection.query(
			`SELECT id, order_number, total, status, delivery_address,
					delivery_method, payment_method, payment_status, notes,
					confirmation_email_sent, confirmation_email_sent_at,
					created_at, updated_at
			 FROM orders
			 WHERE id = ? AND user_id = ?`,
			[orderId, userId]
		);

		if (!orders.length) {
			console.error(`Order not found: orderId=${orderId}, userId=${userId}`);
			return { success: false, emailSent: false, error: 'Order not found' };
		}

		const order = orders[0];
		const isDemo = order.payment_method === "card_demo";

		// Check if email was already sent (prevent duplicates)
		if (order.confirmation_email_sent) {
			console.log(`Email already sent for order ${order.order_number}`);
			return { success: true, emailSent: true, alreadySent: true };
		}

		// Step 2: Fetch order items
		const [items] = await connection.query(
			`SELECT product_id, product_name, quantity, price_at_purchase
			 FROM order_items
			 WHERE order_id = ?`,
			[orderId]
		);

		// Fetch customer details
		const [users] = await connection.query(
			`SELECT name, email FROM users WHERE id = ?`,
			[userId]
		);

		const customer = users[0];
		const customerName = customer?.name || 'Valued Customer';
		const customerEmailAddress = customer?.email || customerEmail;

		// Validate customer email
		if (!customerEmailAddress) {
			console.error(`No email address for order ${order.order_number}`);
			return { success: false, emailSent: false, error: 'No customer email address' };
		}

		// Step 3: Calculate totals
		const subtotal = items.reduce((sum, item) => sum + (Number(item.price_at_purchase) * item.quantity), 0);
		
		// Extract delivery fee from total
		const deliveryFee = Number(order.total) - subtotal;

		// Prepare order data for templates
		const orderData = {
			orderNumber: order.order_number,
			items: items.map(item => ({
				name: item.product_name,
				quantity: item.quantity,
				price: Number(item.price_at_purchase),
			})),
			subtotal: subtotal,
			deliveryFee: deliveryFee >= 0 ? deliveryFee : 0,
			total: Number(order.total),
			customerName: customerName,
			customerEmail: customerEmailAddress,
			deliveryAddress: order.delivery_address,
			deliveryMethod: order.delivery_method,
			paymentStatus: order.payment_status,
			createdAt: order.created_at,
		};

		// Step 4: Generate HTML email and PDF receipt
		let htmlContent, pdfBuffer;
		try {
			htmlContent = isDemo ? generateDemoOrderEmail(orderData) : generateOrderConfirmationEmail(orderData);
			pdfBuffer = isDemo ? null : await generatePdfReceipt(orderData);
		} catch (error) {
			console.error(`Failed to generate email/PDF for order ${order.order_number}:`, error.message);
			// Continue and try to send email without PDF
			htmlContent = isDemo ? generateDemoOrderEmail(orderData) : generateOrderConfirmationEmail(orderData);
			pdfBuffer = null;
		}

		// Step 5: Send email
		const emailSubject = isDemo
			? `SafeHer Demo Order Confirmation - No payment charged - ${order.order_number}`
			: `SafeHer Order Confirmation - Order #${order.order_number}`;
		const emailOptions = {};

		if (pdfBuffer) {
			emailOptions.attachments = [
				{
					filename: generateReceiptFilename(order.order_number),
					content: pdfBuffer,
					contentType: 'application/pdf',
				},
			];
		}

		const emailSent = await emailService.sendEmail(
			customerEmailAddress,
			emailSubject,
			htmlContent,
			emailOptions
		);

		// Step 6: Update database with email status
		if (emailSent) {
			await connection.query(
				`UPDATE orders 
				 SET confirmation_email_sent = TRUE, 
				     confirmation_email_sent_at = NOW(),
				     confirmation_email_error = NULL
				 WHERE id = ?`,
				[orderId]
			);
			console.log(`✓ Confirmation email sent for order ${order.order_number}`);
		} else {
			// Email failed - log error but DON'T fail the order
			const errorMsg = `Failed to send email to ${customerEmailAddress}`;
			await connection.query(
				`UPDATE orders 
				 SET confirmation_email_error = ?
				 WHERE id = ?`,
				[errorMsg, orderId]
			);
			console.error(`✗ ${errorMsg} for order ${order.order_number}`);
		}

		return {
			success: true,
			emailSent: emailSent,
			orderId: orderId,
			orderNumber: order.order_number,
		};
	} catch (error) {
		console.error('Unexpected error in sendOrderConfirmationEmail:', error.message);
		return { success: false, emailSent: false, error: error.message };
	} finally {
		connection?.release();
	}
}

/**
 * Resend order confirmation email (for admin/support use)
 * 
 * This allows resending a confirmation email if it failed or was requested by customer.
 * Prevents duplicate sends with the alreadySent flag.
 * 
 * @param {number} orderId - Database order ID
 * @param {number} userId - Database user ID  
 * @returns {Promise<object>} - Result object: { success, emailSent, error }
 */
export async function resendOrderConfirmationEmail(orderId, userId) {
	let connection;

	try {
		connection = await pool.getConnection();
		// Fetch order
		const [orders] = await connection.query(
			`SELECT id, user_id FROM orders WHERE id = ? AND user_id = ?`,
			[orderId, userId]
		);

		if (!orders.length) {
			return { success: false, error: 'Order not found' };
		}

		// Fetch customer email
		const [users] = await connection.query(
			`SELECT email FROM users WHERE id = ?`,
			[userId]
		);

		if (!users.length || !users[0].email) {
			return { success: false, error: 'No customer email found' };
		}

		// Reset the sent flag to allow resending
		await connection.query(
			`UPDATE orders 
			 SET confirmation_email_sent = FALSE,
			     confirmation_email_sent_at = NULL
			 WHERE id = ?`,
			[orderId]
		);

		// Release this connection before the sending function acquires another.
		connection.release();
		connection = null;
		return await sendOrderConfirmationEmail(orderId, userId, users[0].email);
	} catch (error) {
		console.error('Error in resendOrderConfirmationEmail:', error.message);
		return { success: false, emailSent: false, error: error.message };
	} finally {
		connection?.release();
	}
}

/**
 * Batch resend failed confirmation emails
 * 
 * Useful for periodically retrying orders that failed to send emails.
 * 
 * @returns {Promise<object>} - Result with total, resent, and failed counts
 */
export async function resendFailedOrderEmails() {
	const connection = await pool.getConnection();
	let resent = 0;
	let failed = 0;

	try {
		// Find orders where email sending failed
		const [failedOrders] = await connection.query(
			`SELECT id, user_id FROM orders 
			 WHERE confirmation_email_sent = FALSE 
			 AND confirmation_email_error IS NOT NULL
			 ORDER BY created_at DESC
			 LIMIT 100`
		);

		console.log(`Found ${failedOrders.length} orders with failed emails`);

		for (const order of failedOrders) {
			const result = await sendOrderConfirmationEmail(order.id, order.user_id, null);
			if (result.emailSent) {
				resent++;
			} else {
				failed++;
			}
		}

		return { total: failedOrders.length, resent, failed };
	} catch (error) {
		console.error('Error in resendFailedOrderEmails:', error.message);
		return { total: 0, resent: 0, failed: 0, error: error.message };
	} finally {
		connection?.release();
	}
}

export default {
	sendOrderConfirmationEmail,
	resendOrderConfirmationEmail,
	resendFailedOrderEmails,
};
