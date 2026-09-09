import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

/**
 * PDF Receipt Generator for SafeHer Orders
 * Generates professional PDF receipts with order details
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
 * Generate a PDF receipt as a Buffer
 * @param {object} order - Order object containing details
 * @returns {Promise<Buffer>} - PDF content as buffer
 */
export async function generatePdfReceipt(order) {
	return new Promise((resolve, reject) => {
		try {
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

			// Create a new PDF document
			const doc = new PDFDocument({
				size: 'A4',
				margin: 40,
			});

			const chunks = [];
			doc.on('data', chunk => chunks.push(chunk));
			doc.on('end', () => {
				const pdfBuffer = Buffer.concat(chunks);
				resolve(pdfBuffer);
			});
			doc.on('error', (error) => {
				reject(error);
			});

			// Colors
			const primaryColor = '#351536';
			const accentColor = '#d92d36';
			const lightGray = '#f9f7fb';
			const darkGray = '#5a4d5c';

			// Helper function to add a horizontal line
			const addLine = (y, color = '#ecd9ef') => {
				doc.strokeColor(color)
					.lineWidth(1)
					.moveTo(40, y)
					.lineTo(doc.page.width - 40, y)
					.stroke();
			};

			// --- Header ---
			doc.fontSize(28)
				.font('Helvetica-Bold')
				.fillColor(primaryColor)
				.text('SafeHer', 0, 40, { align: 'center' });

			doc.fontSize(11)
				.font('Helvetica')
				.fillColor(darkGray)
				.text('Stay Safe. Stay Connected.', 0, 72, { align: 'center' });

			doc.fontSize(11)
				.fillColor(darkGray)
				.text('www.safeher.co.za', 0, 90, { align: 'center' });

			addLine(110);

			// --- Order Title ---
			doc.fontSize(18)
				.font('Helvetica-Bold')
				.fillColor(primaryColor)
				.text('ORDER RECEIPT', 0, 130, { align: 'center' });

			// --- Order Number and Status ---
			let y = 160;
			doc.fontSize(13)
				.font('Helvetica-Bold')
				.fillColor(primaryColor)
				.text(`Order #${orderNumber}`, 40, y);

			doc.fontSize(10)
				.font('Helvetica')
				.fillColor(darkGray)
				.text(`Date: ${formatDate(createdAt)}`, 300, y)
				.text(`Status: Confirmed`, 300, y + 18);

			// --- Customer Information ---
			y += 60;
			doc.fontSize(11)
				.font('Helvetica-Bold')
				.fillColor(primaryColor)
				.text('Customer Information', 40, y);

			y += 20;
			doc.fontSize(10)
				.font('Helvetica')
				.fillColor(darkGray)
				.text(`Name: ${customerName || 'N/A'}`, 40, y)
				.text(`Email: ${customerEmail || 'N/A'}`, 40, y + 16)
				.text(`Payment Status: ${paymentStatus ? paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1) : 'Pending'}`, 40, y + 32);

			// --- Delivery Information ---
			y += 80;
			addLine(y - 10);
			doc.fontSize(11)
				.font('Helvetica-Bold')
				.fillColor(primaryColor)
				.text('Delivery Address', 40, y + 10);

			y += 30;
			doc.fontSize(10)
				.font('Helvetica')
				.fillColor(darkGray);

			const addressLines = deliveryAddress
				? deliveryAddress.split('\n').map(line => line.trim())
				: ['Not specified'];

			let addressY = y;
			for (const line of addressLines) {
				doc.text(line, 40, addressY);
				addressY += 14;
			}

			doc.fontSize(10)
				.fillColor(darkGray)
				.text(`Delivery Method: ${deliveryMethod || 'Standard'}`, 40, addressY + 8);

			// --- Order Items ---
			y = addressY + 40;
			addLine(y);

			doc.fontSize(11)
				.font('Helvetica-Bold')
				.fillColor(primaryColor)
				.text('Order Summary', 40, y + 15);

			y += 40;

			// Table headers
			const headers = ['Product', 'Qty', 'Unit Price', 'Total'];
			const columnWidths = [250, 50, 100, 70];
			let x = 40;

			doc.fontSize(10)
				.font('Helvetica-Bold')
				.fillColor(primaryColor);

			for (let i = 0; i < headers.length; i++) {
				doc.text(headers[i], x, y, { width: columnWidths[i], align: i === 0 ? 'left' : 'right' });
				x += columnWidths[i];
			}

			y += 20;
			addLine(y - 5, '#ecd9ef');

			// Table rows
			doc.fontSize(10)
				.font('Helvetica')
				.fillColor(darkGray);

			for (const item of items) {
				y += 20;
				x = 40;

				const productName = item.name || 'Unknown Product';
				const quantity = item.quantity;
				const unitPrice = formatCurrency(item.price);
				const itemTotal = formatCurrency(item.price * item.quantity);

				doc.text(productName, x, y, { width: columnWidths[0], align: 'left' });
				x += columnWidths[0];
				doc.text(String(quantity), x, y, { width: columnWidths[1], align: 'right' });
				x += columnWidths[1];
				doc.text(unitPrice, x, y, { width: columnWidths[2], align: 'right' });
				x += columnWidths[2];
				doc.text(itemTotal, x, y, { width: columnWidths[3], align: 'right' });
			}

			y += 20;
			addLine(y, '#ecd9ef');

			// --- Totals ---
			y += 15;
			const subtotalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

			doc.fontSize(10)
				.font('Helvetica')
				.fillColor(darkGray);

			doc.text('Subtotal:', 300, y, { align: 'right' })
				.text(formatCurrency(subtotalAmount), 520, y, { align: 'right' });

			if (deliveryFee > 0) {
				y += 18;
				doc.text('Delivery Fee:', 300, y, { align: 'right' })
					.text(formatCurrency(deliveryFee), 520, y, { align: 'right' });
			}

			y += 25;
			doc.fontSize(13)
				.font('Helvetica-Bold')
				.fillColor(accentColor);

			addLine(y - 8, accentColor);
			doc.text('Total Amount:', 300, y, { align: 'right' })
				.text(formatCurrency(total), 520, y, { align: 'right' });

			// --- Footer ---
			y = doc.page.height - 100;
			addLine(y);

			doc.fontSize(9)
				.font('Helvetica')
				.fillColor(darkGray)
				.text('Thank you for your purchase from SafeHer.', 0, y + 15, { align: 'center' })
				.text('Your safety and security are our priority.', 0, y + 28, { align: 'center' })
				.text('For support, contact support@safeher.co.za', 0, y + 41, { align: 'center' });

			doc.fontSize(8)
				.fillColor('#9a8d9e')
				.text(`Generated on ${formatDate(new Date())} • SafeHer Order Receipt`, 0, doc.page.height - 20, { align: 'center' });

			// Finalize the PDF
			doc.end();
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Generate a filename for the receipt PDF
 * @param {string} orderNumber - Order number
 * @returns {string} - Filename like "SafeHer-Receipt-SH-2026-000001.pdf"
 */
export function generateReceiptFilename(orderNumber) {
	return `SafeHer-Receipt-${orderNumber}.pdf`;
}

export default {
	generatePdfReceipt,
	generateReceiptFilename,
	formatCurrency,
	formatDate,
};
