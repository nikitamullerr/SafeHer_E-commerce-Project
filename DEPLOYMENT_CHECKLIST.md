# 🚀 Email System Deployment Checklist

## Pre-Deployment Verification

### Code Review
- [ ] All 4 new backend services created
- [ ] All 6 existing files properly modified
- [ ] No syntax errors in any file
- [ ] All imports are correct
- [ ] Database schema includes email tracking fields

### Dependencies
- [ ] `nodemailer ^6.9.7` added to package.json
- [ ] `pdfkit ^0.13.0` added to package.json
- [ ] `npm install` run successfully in backend/
- [ ] `npm list nodemailer` shows correct version
- [ ] `npm list pdfkit` shows correct version

### Configuration
- [ ] `.env` file has EMAIL_SERVICE defined
- [ ] `.env.example` created with all variables
- [ ] No hardcoded credentials in any source files
- [ ] All email env variables are present
- [ ] EMAIL_FROM format is correct (e.g., "SafeHer <address@example.com>")

### Database
- [ ] Database migration run (schema.sql applied)
- [ ] `orders` table has 3 new columns:
  - [ ] `confirmation_email_sent` (BOOLEAN)
  - [ ] `confirmation_email_sent_at` (TIMESTAMP)
  - [ ] `confirmation_email_error` (TEXT)
- [ ] Users table has `email` column
- [ ] All foreign keys intact

---

## Installation Steps Checklist

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```
- [ ] Command completes without errors
- [ ] nodemailer installed
- [ ] pdfkit installed
- [ ] node_modules created

### 2. Configure Email Service

**Choose SMTP:**
```bash
# Edit backend/.env
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.gmail.com  # or your provider
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=SafeHer <orders@safeher.co.za>
```
- [ ] .env updated with real credentials
- [ ] Credentials tested (not in error state)
- [ ] PORT variable still set correctly
- [ ] DB variables intact

**Or Choose Resend:**
```bash
# Edit backend/.env
EMAIL_SERVICE=resend
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=SafeHer <orders@safeher.co.za>
```
- [ ] Resend API key obtained
- [ ] .env updated
- [ ] Email address verified in Resend dashboard

### 3. Database Migration
```bash
# Apply schema changes
mysql -u root -p safeher_db < backend/database/schema.sql
```
- [ ] Command executes without errors
- [ ] New columns exist in orders table
- [ ] No data loss in existing records

### 4. Verify Configuration
Start backend:
```bash
npm start
```
- [ ] Server starts without errors
- [ ] Port 5000 is available
- [ ] Database connection successful
- [ ] Log shows: "✓ Email service configured: SMTP" (or resend)
- [ ] Log shows: "✓ Server running on port 5000"

---

## Testing Checklist

### Unit Tests (Per Service)

**Email Service Test**
```bash
cd backend
node -e "import emailService from './services/emailService.js'; console.log('Ready:', emailService.isReady())"
```
- [ ] Returns `Ready: true`
- [ ] No connection errors
- [ ] Service initialized

**Email Templates Test**
```bash
node -e "import { generateOrderConfirmationEmail } from './services/emailTemplates.js'; const html = generateOrderConfirmationEmail({orderNumber: 'TEST-001', total: 100}); console.log('HTML generated:', html.length > 1000)"
```
- [ ] Returns `HTML generated: true`
- [ ] HTML contains SafeHer branding
- [ ] HTML is valid

**PDF Generator Test**
```bash
node -e "import { generatePdfReceipt } from './services/pdfReceiptGenerator.js'; generatePdfReceipt({orderNumber: 'TEST-001', total: 100, items: []}).then(() => console.log('✓ PDF generated'))"
```
- [ ] Returns `✓ PDF generated`
- [ ] No PDF generation errors
- [ ] Buffer is created

### Integration Test

**Manual Order Test**
1. [ ] Frontend running at localhost:5173
2. [ ] Backend running at localhost:5000
3. [ ] Create new customer account
   - [ ] Email: your-test-email@example.com
   - [ ] Password set
   - [ ] Account confirmed
4. [ ] Add product to cart (any product)
5. [ ] Click "Check out"
6. [ ] Select delivery method
   - [ ] Choose "Standard delivery" or "Express"
   - [ ] Click "Continue"
7. [ ] Enter delivery address
   - [ ] Street: "123 Test Street"
   - [ ] City: "Test City"
   - [ ] Province: "Test Province"
   - [ ] Click "Continue"
8. [ ] Enter payment details
   - [ ] Name: "Test Customer"
   - [ ] Card: "4111111111111111"
   - [ ] Expiry: "12/25"
   - [ ] CVV: "123"
   - [ ] Click "Pay R[amount]"
9. [ ] See success modal
   - [ ] Contains order number (e.g., "SH-2026-000001")
   - [ ] Shows "Confirmation Email Sent"
   - [ ] Shows customer email
   - [ ] Has "View Order" and "Continue Shopping" buttons
10. [ ] Check backend logs
    - [ ] Shows: "✓ Email sent to your-test-email@example.com: ..."
    - [ ] No error messages
11. [ ] Check email (wait max 30 seconds)
    - [ ] Received email from SafeHer
    - [ ] Subject: "SafeHer Order Confirmation - Order #SH-2026-000001"
    - [ ] From: "SafeHer <orders@safeher.co.za>"
    - [ ] Contains order details
    - [ ] Contains SafeHer branding
    - [ ] PDF attachment present
12. [ ] Check database
    ```sql
    SELECT order_number, confirmation_email_sent, confirmation_email_sent_at 
    FROM orders ORDER BY created_at DESC LIMIT 1;
    ```
    - [ ] Shows order number matching email
    - [ ] confirmation_email_sent = 1 (TRUE)
    - [ ] confirmation_email_sent_at has timestamp

### Resend Email Endpoint Test

```bash
# Get JWT token from browser localStorage (safeher-token)
# Get order ID from database

curl -X POST http://localhost:5000/api/orders/1/resend-confirmation-email \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```
- [ ] Returns HTTP 200
- [ ] Response: `{"success": true, "message": "...", "emailSent": true}`
- [ ] Email received again
- [ ] Database shows updated confirmation_email_sent_at

### Error Handling Test

**Test 1: Invalid Email Address**
```javascript
// In App.vue, temporarily change email to invalid value
// Create order and check:
```
- [ ] Order still created
- [ ] Backend logs show email error
- [ ] Database shows confirmation_email_error = "Invalid email"
- [ ] Frontend still shows success

**Test 2: SMTP Connection Failure**
```bash
# Edit .env: EMAIL_HOST = "invalid.host.com"
# Restart backend
# Create order
```
- [ ] Order created
- [ ] Backend logs show connection error
- [ ] Database shows confirmation_email_error
- [ ] Frontend shows success (email failure doesn't break order)
- [ ] Database shows confirmation_email_sent = 0

---

## Performance Testing

### Load Test
- [ ] Create 5 orders in quick succession
- [ ] All orders have email_sent = true
- [ ] All emails received within 2 minutes
- [ ] Database queries complete in <100ms
- [ ] No database locks or timeouts
- [ ] All PDFs generated correctly

### Email Service Load
- [ ] Monitor system resources during order creation
- [ ] Check if email sending impacts order response time
- [ ] Verify non-blocking email send (response <100ms)
- [ ] Check for any connection pool exhaustion

---

## Security Verification

- [ ] No email credentials in source code (grep for passwords)
- [ ] .env file is in .gitignore
- [ ] .env.example has only placeholders
- [ ] Email validation prevents injection
- [ ] API endpoints require authentication
- [ ] Users can only resend their own orders
- [ ] Error messages don't expose system details
- [ ] PDF generated in memory, not on disk

```bash
# Verify no credentials in code:
grep -r "password" backend/services/ backend/utils/ | grep -v node_modules
grep -r "EMAIL_USER" backend/services/ backend/utils/ | grep -v "process.env"
```
- [ ] Only environment variable references found (no hardcoded values)

---

## Documentation Review

- [ ] EMAIL_SYSTEM_SETUP.md complete and accurate
- [ ] EMAIL_TEST_GUIDE.md with working examples
- [ ] IMPLEMENTATION_SUMMARY.md explains all changes
- [ ] .env.example has all required variables
- [ ] README updated (if applicable)
- [ ] All API endpoints documented
- [ ] All environment variables documented

---

## Production Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Database migration applied to production
- [ ] .env configured with production credentials
- [ ] Email service tested with test order
- [ ] PDF generation tested
- [ ] All dependencies versions locked
- [ ] No development dependencies in production build

### Deployment
- [ ] Code deployed to production server
- [ ] Database schema updated
- [ ] Dependencies installed on production
- [ ] Environment variables set correctly
- [ ] Backend restarted
- [ ] Email service initialized successfully

### Post-Deployment
- [ ] Monitor email logs for 24 hours
- [ ] Check for any error messages
- [ ] Verify customer emails being received
- [ ] Monitor database email status
- [ ] Check server resources (CPU, memory, disk)
- [ ] Verify no customer data leaks
- [ ] Test resend endpoint
- [ ] Alert if email failures exceed threshold

---

## Rollback Plan

If issues occur:

1. **Email Service Failures (Non-Critical)**
   ```bash
   # Orders still work, just disable emails in .env
   EMAIL_SERVICE=disabled
   # Restart backend
   ```
   - [ ] Service disabled
   - [ ] Orders continue working
   - [ ] Set reminder to debug and re-enable

2. **Database Issues**
   ```bash
   # Restore from backup before email columns added
   mysql -u root -p safeher_db < backup.sql
   ```
   - [ ] Backup restored
   - [ ] Orders table intact
   - [ ] Service restarted

3. **Complete Rollback**
   ```bash
   # Revert to previous code version
   git checkout previous-commit
   npm install
   npm start
   ```
   - [ ] Previous version deployed
   - [ ] All services working
   - [ ] Email system disabled

---

## Monitoring (Ongoing)

### Daily Checks
- [ ] Email service is running
- [ ] No errors in logs
- [ ] Email delivery time <10 seconds
- [ ] Zero failed orders
- [ ] Customer complaints about email

### Weekly Checks
- [ ] Review email statistics
  ```sql
  SELECT 
    COUNT(*) as total_orders,
    SUM(confirmation_email_sent) as emails_sent,
    SUM(CASE WHEN confirmation_email_error IS NOT NULL THEN 1 ELSE 0 END) as failed_emails
  FROM orders 
  WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY);
  ```
- [ ] Email delivery success rate
- [ ] Average response times
- [ ] Database growth (email_error field)

### Monthly Checks
- [ ] Review failed email log
- [ ] Check for patterns in failures
- [ ] Test email service with real SMTP
- [ ] Review security logs
- [ ] Test disaster recovery

---

## Contacts & Support

**Email Service Issues**:
- Check [EMAIL_SYSTEM_SETUP.md](./EMAIL_SYSTEM_SETUP.md) → Troubleshooting
- Review backend logs for specific errors
- Test SMTP credentials separately

**Database Issues**:
- Check MySQL error logs
- Verify schema matches expected columns
- Restore from backup if needed

**Frontend Issues**:
- Check browser console for errors
- Verify API endpoints returning correct data
- Test localStorage for JWT token

---

**Checklist Version**: 1.0
**Last Updated**: September 7, 2026
**Status**: Ready for Use ✅

---

## Quick Reference Commands

```bash
# Check email service status
npm start  # Look for "Email service configured" message

# Verify dependencies installed
npm list nodemailer pdfkit

# Test database schema
mysql -u root -p safeher_db -e "DESCRIBE orders;"

# Check email status of recent orders
mysql -u root -p safeher_db -e "
  SELECT order_number, confirmation_email_sent, confirmation_email_error 
  FROM orders ORDER BY created_at DESC LIMIT 5;"

# Monitor email logs in real-time
npm start 2>&1 | grep -i "email"

# Test email endpoint (replace with real token and order ID)
curl -X POST http://localhost:5000/api/orders/1/resend-confirmation-email \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json"
```
