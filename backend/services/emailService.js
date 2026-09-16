import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url) });

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

export class EmailService {
	constructor() {
		this.transporter = null;
		this.emailService = (process.env.EMAIL_SERVICE || 'smtp').toLowerCase();
		this.fromEmail = this.resolveFromAddress();
		this.initializeTransporter();
	}

	resolveFromAddress() {
		const configuredFrom = (process.env.EMAIL_FROM || '').trim();
		if (this.emailService === 'resend') return configuredFrom;
		const accountEmail = (process.env.EMAIL_USER || '').trim();
		const accountValid = this.isValidEmail(accountEmail);
		const configuredValid = configuredFrom && (() => {
			const match = configuredFrom.match(/<([^>]+)>/);
			return this.isValidEmail(match ? match[1] : configuredFrom);
		})();
		if (accountValid && configuredValid) {
			const accountDomain = accountEmail.split('@')[1]?.toLowerCase();
			const configuredAddress = configuredFrom.match(/<([^>]+)>/) ? configuredFrom.match(/<([^>]+)>/)[1] : configuredFrom;
			const configuredDomain = configuredAddress.split('@')[1]?.toLowerCase();
			if (accountDomain === 'gmail.com' && configuredDomain && configuredDomain !== accountDomain) {
				return accountEmail;
			}
			if (configuredAddress.toLowerCase() !== accountEmail.toLowerCase()) {
				return configuredFrom;
			}
		}
		if (configuredValid) {
			return configuredFrom;
		}
		if (accountValid) return accountEmail;
		return 'noreply@safeher.co.za';
	}

	normalizeSmtpValue(value) {
		return String(value ?? '').replace(/\s+/g, '').trim();
	}

	initializeTransporter() {
		if (this.emailService === 'resend') {
			console.log('Email service configured: Resend API');
			return;
		}

		const smtpUser = this.normalizeSmtpValue(process.env.EMAIL_USER);
		const smtpPass = this.normalizeSmtpValue(process.env.EMAIL_PASSWORD);
		const smtpHost = (process.env.EMAIL_HOST || '').trim();
		const smtpConfig = {
			dnsTimeout: 10000,
			connectionTimeout: 10000,
			greetingTimeout: 10000,
			socketTimeout: 15000,
			host: smtpHost,
			port: parseInt(process.env.EMAIL_PORT || '587', 10),
			secure: process.env.EMAIL_SECURE === 'true',
			auth: {
				user: smtpUser,
				pass: smtpPass,
			},
		};

		if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
			console.warn('⚠️  Email service not fully configured. Check .env variables:');
			console.warn('   - EMAIL_HOST');
			console.warn('   - EMAIL_USER');
			console.warn('   - EMAIL_PASSWORD');
			console.warn('   - EMAIL_PORT (optional, default: 587)');
			console.warn('   - EMAIL_SECURE (optional, default: false)');
			console.warn('   - EMAIL_FROM (optional, default: your authenticated email)');
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

		if (this.emailService === 'resend') {
			if (!this.isReady()) {
				console.error('Resend requires RESEND_API_KEY and EMAIL_FROM.');
				return false;
			}
			try {
				const attachments = (options.attachments || []).map(attachment => {
					if (!Buffer.isBuffer(attachment.content)) throw new Error('Resend attachments must use Buffer content.');
					return { filename: attachment.filename, content: attachment.content.toString('base64') };
				});
				const response = await fetch('https://api.resend.com/emails', {
					method: 'POST',
					headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`, 'Content-Type': 'application/json' },
					body: JSON.stringify({ from: this.fromEmail, to: [to.trim()], subject, html, ...(options.text ? { text: options.text } : {}), ...(attachments.length ? { attachments } : {}) }),
					signal: AbortSignal.timeout(15000),
				});
				const result = await response.json();
				if (!response.ok || !result.id) {
					console.error('Resend rejected email:', response.status, result.name || 'provider_error');
					return false;
				}
				console.log('Resend accepted email:', result.id);
				return true;
			} catch (error) {
				console.error('Resend delivery failed:', error.name);
				return false;
			}
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
			if (!info.accepted?.length) return false;
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
		if (!email || typeof email !== 'string') return false;
		const value = email.trim();
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(value);
	}

	/**
	 * Check if email service is ready
	 * @returns {boolean} - Ready status
	 */
	isReady() {
		if (this.emailService === 'resend') {
			const address = this.fromEmail.match(/<([^>]+)>/)?.[1] || this.fromEmail;
			return Boolean(process.env.RESEND_API_KEY?.trim() && this.isValidEmail(address));
		}
		return this.transporter !== null;
	}
}

// Export singleton instance
export default new EmailService();
