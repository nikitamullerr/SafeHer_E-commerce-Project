# Checkout and payments

The shop supports PayFast and a clearly labelled card-entry demo. PayGate has been removed.

## PayFast setup

Configure these values in `backend/.env` (never commit this file):

```dotenv
PAYFAST_SANDBOX=true
PAYFAST_MERCHANT_ID=your-sandbox-merchant-id
PAYFAST_MERCHANT_KEY=your-sandbox-merchant-key
PAYFAST_PASSPHRASE=your-dashboard-passphrase-if-set
PAYFAST_NOTIFY_URL=https://your-public-backend.example/api/payments/payfast/itn
FRONTEND_URL=http://localhost:5173
```

`PAYFAST_NOTIFY_URL` is the complete notification endpoint, not just the hostname. Replace the example domain with your deployed backend or HTTPS tunnel address. PayFast cannot reach localhost. Restart the backend after changing configuration. Checkout stays unavailable while the merchant credentials or notification URL are missing. No public URL or tunnel is created automatically.

The frontend submits a signed POST form to PayFast. Payment is recorded as paid only after the notification signature, merchant, amount and PayFast server validation pass. Returning to the success page alone does not mark an order paid. Confirmed payments trigger the receipt email. Retry uses the original pending order without making another order or reserving stock again.

Sandbox does not charge real money. See the [official PayFast integration documentation](https://developers.payfast.co.za/docs/) for sandbox, signatures and notifications.

## Card form demo

Use card `4242 4242 4242 4242`, a test cardholder name, a future expiry and CVV `123`. The form checks the card checksum, expiry and CVV. Card data stays in the form and is not sent to the API or saved. Demo orders use `card_demo`, are not marked paid, do not reserve stock, send clearly labelled demo confirmations without a payment receipt attachment, and are excluded from the paid total. They are not delivered.

The demo defaults to available outside production and disabled in production. Set `CARD_DEMO_ENABLED=true` or `false` explicitly to override. This is not a live card-processing integration.

## Addresses and orders

Standard and express delivery are supported. Saved addresses are stored in the existing `addresses` database table for the authenticated account. Users can save, select and remove addresses; repeat saves of the same normalized address reuse the existing record. Older browser-only address lists are not automatically attached to accounts.

The order page supports search, payment filters, sorting, refresh, retrying a pending PayFast payment and sending/resending paid-order receipts. Only administrators can advance paid orders through delivery stages. Pending PayFast orders reserve stock; automatic expiration/release of abandoned reservations is not implemented.

## Checks

Run `npm.cmd test` from the project root, and `npm.cmd run build` to compile the frontend. Automated backend tests mock database/provider operations; they do not charge money or send email. Live checkout still needs a configured public notification URL and a sandbox round trip.
