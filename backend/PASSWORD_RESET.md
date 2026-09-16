# Password reset

POST /api/auth/forgot-password with JSON {"email":"your-account@example.com"} requests a reset email. A generic response avoids exposing registered addresses.

Open the email link. Enter a new password (at least 8 characters, at most 72 UTF-8 bytes). The frontend posts {"token":"...","password":"..."} to POST /api/auth/reset-password. Sign in with the new password afterward.

Reset links expire after 30 minutes, are single-use, and a newer request replaces the previous link. Only a SHA-256 hash of the token is stored in password_resets. Startup creates this table automatically. Passwords are hashed with bcrypt. Reset requests are rate limited.

FRONTEND_URL in backend/.env must point to the browser-accessible frontend (currently localhost:5173). Configure EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASSWORD and EMAIL_FROM for SMTP. Do not commit credentials.

Verified against MySQL using a temporary account and mocked email: original login, reset request, reset completion, reused token rejection, old password rejection, new password login. SMTP authentication verified separately without sending email. Actual inbox delivery must be tested using Forgot password for your account.

Existing JWT sessions remain valid until expiry; resetting a password does not currently sign out other devices.
