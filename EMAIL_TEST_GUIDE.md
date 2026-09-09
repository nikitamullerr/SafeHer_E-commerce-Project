# Email System Quick Test Guide

## Prerequisites
- SafeHer project running on `http://localhost:5173` (frontend) and `http://localhost:5000` (backend)
- MySQL database set up with latest schema
- Dependencies installed: `npm install` in `/backend`
- Email configured in `.env` file

---

## Quick Start Testing

### 1. Start Backend with Logs Visible

```bash
cd backend
npm start
```

Watch for:
```
✓ Email service configured: SMTP
```

### 2. Open Frontend

```
http://localhost:5173
```

### 3. Create Test Account

1. Click "Sign in"
2. Click "Sign up here"
3. Fill in:
   - Name: `Test Customer`
   - Email: `your-email@gmail.com` (where you want to receive test emails)
   - Password: `TestPassword123!`
4. Click "Create account"

### 4. Place Test Order

1. Click home button
2. Add any product to cart (e.g., Smart Panic Button)
3. Click cart icon
4. Click "Check out"
5. Step 1: Select delivery method (Standard/Express)
6. Step 2: Enter delivery address
   ```
   123 Main Street
   Sandton
   Johannesburg
   Gauteng
   ```
7. Step 3: Enter fake payment details
   ```
   Name: Test Customer
   Card: 4111111111111111
   Expiry: 12/25
   CVV: 123
   ```
8. Click "Pay R[amount]"

### 5. Verify Success Modal

Check that you see:
- ✅ "Order Confirmed!" title
- ✅ Order number (like `SH-2026-000001`)
- ✅ Green checkmark with "Confirmation Email Sent"
- ✅ Customer email shown
- ✅ "What's next?" section with steps
- ✅ "View Order" and "Continue Shopping" buttons

### 6. Check Backend Logs

In terminal where backend is running, look for:
```
✓ Email sent to your-email@gmail.com: <message-id>
```

### 7. Check Email

Check your email inbox (may take 10-30 seconds):

**Email Details:**
- **From**: SafeHer <orders@safeher.co.za>
- **Subject**: `SafeHer Order Confirmation - Order #SH-2026-000001`
- **Content**: 
  - SafeHer logo and branding
  - "Order Confirmed" heading
  - Order number, date, payment status
  - Product details with quantities
  - Subtotal, delivery fee, total
  - Delivery address
  - Next steps

**Attachment:**
- `SafeHer-Receipt-SH-2026-000001.pdf` (download and open to verify)

### 8. Check Database

```bash
mysql -u root -p safeher_db

SELECT order_number, confirmation_email_sent, 
       confirmation_email_sent_at, confirmation_email_error
FROM orders 
ORDER BY created_at DESC 
LIMIT 1;
```

Should show:
```
confirmation_email_sent: 1
confirmation_email_sent_at: 2026-09-07 10:30:45
confirmation_email_error: NULL
```

### 9. View Orders Page

1. Click "Orders" in navigation
2. You should see your order:
   - Order number
   - Date
   - Status
   - Total amount
   - Product list

### 10. Test Resend Email

In browser console:
```javascript
fetch('http://localhost:5000/api/orders/1/resend-confirmation-email', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('safeher-token')}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(d => console.log(d))
```

Expected response:
```json
{
  "success": true,
  "message": "Confirmation email has been resent",
  "emailSent": true
}
```

Check email again - you should receive another copy (unless duplicate prevention is active).

---

## Troubleshooting During Testing

### Email Not Received After 1 Minute

1. **Check Backend Logs**
   ```
   Look for: ✗ Failed to send email...
   ```

2. **Check .env Configuration**
   ```bash
   grep EMAIL backend/.env
   ```
   Should show all EMAIL_ variables set

3. **Check Email Provider**
   - Gmail: Check "Less secure apps" setting
   - Other SMTP: Verify host/port/credentials

4. **Check Email Spam Folder**
   - Email might be marked as spam
   - Add `orders@safeher.co.za` to contacts

### PDF Not Attached to Email

1. Check backend logs for PDF generation errors
2. Verify PDFKit is installed: `npm list pdfkit`
3. Try resending (should generate PDF again)

### Database Fields Not Showing

1. Run migration:
   ```bash
   mysql -u root -p safeher_db < backend/database/schema.sql
   ```

2. Verify columns exist:
   ```sql
   DESCRIBE orders;
   ```
   Should show:
   - `confirmation_email_sent`
   - `confirmation_email_sent_at`
   - `confirmation_email_error`

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Email not sending | SMTP not configured | Update `.env` with valid credentials |
| Authentication failed | Wrong password | Use Gmail App Password, not regular password |
| Port 587 timeout | Firewall blocking | Try port 465 with `EMAIL_SECURE=true` |
| PDF not attached | PDFKit not installed | Run `npm install pdfkit` |
| Email shows as spam | SafeHer domain new | Add to contacts, wait for domain reputation |
| Database error | Schema not updated | Run `schema.sql` migration |
| Order creates but email missing | Service not ready | Check logs for "Email service not configured" |

---

## Manual Testing Commands

### Test Email Service Directly

```bash
cd backend
node -e "
import emailService from './services/emailService.js';

const isReady = emailService.isReady();
console.log('Email service ready:', isReady);
"
```

### Send Test Email via API

In browser console after creating account:

```javascript
const token = localStorage.getItem('safeher-token');
const testOrderId = 1; // Change to actual order ID

fetch('http://localhost:5000/api/orders/' + testOrderId + '/resend-confirmation-email', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Success:', data);
  if (data.emailSent) {
    console.log('✓ Email resent successfully');
  } else {
    console.log('✗ Email failed:', data.error);
  }
});
```

### Check Order Email Status in Database

```sql
SELECT 
  id,
  order_number,
  total,
  confirmation_email_sent,
  confirmation_email_sent_at,
  confirmation_email_error,
  created_at
FROM orders 
WHERE user_id = 1
ORDER BY created_at DESC;
```

---

## Performance Testing

### Send Multiple Orders

Create 5 test orders quickly:

1. Add product to cart
2. Checkout (with same delivery info to save time)
3. Repeat steps 1-2 four more times

**Check:**
- ✓ All orders created
- ✓ All emails sent (check logs)
- ✓ All emails received
- ✓ Database shows all email statuses

### Check Email Service Load

Monitor in `/backend/services/emailService.js`:
- Each email send is logged
- Watch for rate limiting on SMTP server

---

## Acceptance Criteria Checklist

After running full test, verify:

- [ ] Order successfully created with order number
- [ ] Checkout shows success modal
- [ ] Order number displayed in modal
- [ ] Email confirmation status shown in modal
- [ ] Email received within 2 minutes
- [ ] Email has SafeHer branding
- [ ] Email contains order number, date, status
- [ ] Email lists all products with quantities and prices
- [ ] Email shows subtotal, delivery fee, and total
- [ ] Email shows delivery address
- [ ] Email has "next steps" section
- [ ] PDF receipt attached to email
- [ ] PDF has SafeHer branding
- [ ] PDF contains order details
- [ ] Database shows email sent status
- [ ] Resend email endpoint works
- [ ] Multiple orders can be created
- [ ] All orders receive separate emails
- [ ] No email credentials exposed in logs
- [ ] Email failure doesn't break order creation

---

## Logging Expected Output

### Successful Order with Email

Backend logs should show:
```
✓ Email sent to customer@example.com: <ABC123@mail.example.com>
```

Database should show:
```
confirmation_email_sent = 1
confirmation_email_sent_at = 2026-09-07 10:30:45
confirmation_email_error = NULL
```

### Failed Email (Network Issue)

Backend logs should show:
```
✗ Failed to send email to customer@example.com: Connection timeout
```

Database should show:
```
confirmation_email_sent = 0
confirmation_email_sent_at = NULL
confirmation_email_error = Connection timeout
```

### Manual Resend Success

Backend logs should show:
```
✓ Email sent to customer@example.com: <XYZ789@mail.example.com>
```

API response:
```json
{
  "success": true,
  "message": "Confirmation email has been resent",
  "emailSent": true
}
```

---

## Support

If tests fail:
1. Check logs in backend terminal
2. Verify `.env` configuration
3. Check email provider settings
4. Review the main [EMAIL_SYSTEM_SETUP.md](./EMAIL_SYSTEM_SETUP.md) guide
5. Run database migration if needed

**Estimated Test Time**: 10-15 minutes

**Test Status**: ✅ Ready to run
