# PayFast sandbox checkout

Product checkout offers PayFast alongside the existing payment methods. Premium subscriptions continue using their existing payment flow.

The test merchant credentials are configured in the ignored `backend/.env` file. Never put these settings in Vite environment variables.

```dotenv
PAYFAST_SANDBOX=true
PAYFAST_MERCHANT_ID=your-sandbox-merchant-id
PAYFAST_MERCHANT_KEY=your-sandbox-merchant-key
PAYFAST_PASSPHRASE=
PAYFAST_NOTIFY_URL=https://your-public-backend/api/payments/payfast/itn
FRONTEND_URL=http://localhost:5173
```

Use the merchant dashboard passphrase if one is configured. The notification URL must be reachable by PayFast; localhost cannot receive provider notifications. Without it, sandbox checkout can open but local orders remain pending. Restart the backend after configuring it.

Checkout posts a signed form to `https://sandbox.payfast.co.za/eng/process`. Product prices and delivery are calculated by the server. PayFast orders reserve stock and remain pending until the notification signature, merchant, amount and PayFast server validation pass. The return page only reads payment status. Duplicate notifications do not record payment twice. Retry opens the same pending order without reserving stock again. Abandoned pending orders do not automatically release reserved stock.

Routes:
- `GET /api/payments/config`
- `POST /api/payments/create` (Bearer token; `payment_method: "payfast"`)
- `POST /api/payments/payfast/itn` (PayFast notification; no Bearer token)
- `GET /api/payments/:orderNumber/status` (Bearer token)
- `POST /api/payments/:orderNumber/retry` (Bearer token)

Run `node --test backend/tests/payments.test.js` and `npm.cmd run build`. Tests mock provider validation; completing the real sandbox round trip requires the public callback URL and a browser.

Official documentation: https://developers.payfast.co.za/docs/itn-instant-transaction-notification/
