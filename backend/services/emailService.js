import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Email Service - Handles all email sending operations
 * 
 * Supports two modes:
 * 1. SMTP (via Nodemailer) - for standard SMTP servers
 * 2. Resend API - for managed email service
 * 
 * Configuration via environment variables:
 * - EMAIL_SERVICE: 'smtp' or 'resend' (default: 'smtp')
 * 
 * SMTP Mode:
 * - EMAIL_HOST: SMTP server host
 * - EMAIL_PORT: SMTP server port
 * - EMAIL_SECURE: Use TLS (true/false)
 * - EMAIL_USER: SMTP username/email
 * - EMAIL_PASSWORD: SMTP password
 * - EMAIL_FROM: From email address
 * 
 * Resend Mode:
 * - RESEND_API_KEY: Resend API key
 * - EMAIL_FROM: From email address
 */

class EmailService {
	constructor() {
		this.transporter = null;
		this.fromEmail = process.env.EMAIL_FROM || 'noreply@safeher.co.za';
		this.emailService = process.env.EMAIL_SERVICE || 'smtp';
		this.initializeTransporter();
	}

	initializeTransporter() {
		if (this.emailService === 'resend') {
			console.log('Email service configured: Resend API');
			// Resend will be handled separately if needed
			return;
		}

		// Default to SMTP
		const smtpConfig = {
			host: process.env.EMAIL_HOST,
			port: parseInt(process.env.EMAIL_PORT || '587'),
			secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASSWORD,
			},
		};

		// Validate SMTP configuration
		if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
			console.warn('⚠️  Email service not fully configured. Check .env variables:');
			console.warn('   - EMAIL_HOST');
			console.warn('   - EMAIL_USER');
			console.warn('   - EMAIL_PASSWORD');
			console.warn('   - EMAIL_PORT (optional, default: 587)');
			console.warn('   - EMAIL_SECURE (optional, default: false)');
			console.warn('   - EMAIL_FROM (optional, default: noreply@safeher.co.za)');
			this.transporter = null;
			return;
		}

		try {
			this.transporter = nodemailer.createTransport(smtpConfig);
			console.log('✓ Email service configured: SMTP');
		} catch (error) {
			console.error('Failed to initialize email service:', error.message);
			this.transporter = null;
		}
	}

	/**
	 * Send an email
	 * @param {string} to - Recipient email address
	 * @param {string} subject - Email subject
	 * @param {string} html - HTML content
	 * @param {object} options - Additional nodemailer options
	 * @returns {Promise<boolean>} - Success status
	 */
	async sendEmail(to, subject, html, options = {}) {
		if (!to || !subject || !html) {
			console.error('Email validation failed: Missing required fields');
			return false;
		}

		// Validate email format
		if (!this.isValidEmail(to)) {
			console.error(`Invalid email address: ${to}`);
			return false;
		}

		if (!this.transporter) {
			console.error('Email service not configured. Please check your .env file.');
			return false;
		}

		try {
			const mailOptions = {
				from: this.fromEmail,
				to,
				subject,
				html,
				...options,
			};

			const info = await this.transporter.sendMail(mailOptions);
			console.log(`✓ Email sent to ${to}: ${info.messageId}`);
			return true;
		} catch (error) {
			console.error(`✗ Failed to send email to ${to}:`, error.message);
			return false;
		}
	}

	/**
	 * Validate email format
	 * @param {string} email - Email to validate
	 * @returns {boolean} - Valid or not
	 */
	isValidEmail(email) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	/**
	 * Check if email service is ready
	 * @returns {boolean} - Ready status
	 */
	isReady() {
		return this.transporter !== null;
	}
}

// Export singleton instance
export default new EmailService();
