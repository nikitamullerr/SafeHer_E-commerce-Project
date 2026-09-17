# SafeHer

SafeHer is a personal safety and e-commerce web application. It brings together safety products, trusted contacts, location tools, check-in reminders, and premium learning resources in one place.

Built with Vue and Node.js, the project includes a customer website and a separate administration interface.

## Contributors

- Nikita Muller - nikitamuller1005@gmail.com
- Vuyolwethu Mbekeni - mbekenivuvu@gmail.com
- Nhlakanipho Luthuli - Nhlakanipholuthuli2108@gmail.com
- Khanya Gcilitshane - khanyagcilitshane@gmail.com

## Features

- Animated landing page, responsive layouts, language selector, and light/dark themes.
- Product catalogue and filtering, cart, saved delivery addresses, checkout, and order history with payment and delivery status.
- PayFast checkout for products and premium packages, with server-side payment notification verification.
- Order confirmation emails through EmailJS or SMTP.
- Email/password authentication, Google sign-in, and password reset.
- Safety Hub with a map, location controls, trusted contacts, SOS tools, and check-in reminders.
- Route/location sharing through SMS or WhatsApp; shared links capture the selected location rather than continuously streaming it.
- Premium subscriptions and lesson progress.
- Product reviews and site testimonials.
- Admin dashboard for products, orders, reviews, users, subscriptions, lessons, and aggregate safety activity.
- ImgBB image hosting, with product uploads through the admin editor.

Safety features support users in making contact and sharing information. The app does not dispatch emergency services automatically. Location/time-based danger advisories are not live crime data.

## Technology

| Area | Tools |
| --- | --- |
| Frontend | Vue 3, Vite, Bootstrap, Bootstrap Icons, Axios, SweetAlert2 |
| Maps | Leaflet |
| Backend | Node.js, Express, JWT, bcrypt, Helmet, express-rate-limit |
| Database | MySQL via mysql2 |
| Payments | PayFast |
| Email | EmailJS HTTPS API or Nodemailer SMTP |
| Images | ImgBB |
| Deployment | Render frontend/backend and Aiven MySQL |

## Project structure

```text
src/
  components/          Shared UI, checkout, map, and cart
  pages/               Customer and admin pages
  services/            Frontend API clients and helpers
  translations/        Translation resources
  App.vue              Application shell and view navigation
  languageConfig.js    Language selection and formatting
backend/
  controllers/         Request handlers
  middleware/          Authentication and access checks
  models/              Database models
  utils/               Order email and other backend helpers
  routes/              API endpoints
  services/            Payments, email, subscriptions, and image hosting
  database/            Schema, migrations, and catalogue scripts
  config/              Database configuration
  scripts/             Admin account setup
  tests/               Backend tests
shared/                Delivery rules and hosted image mappings
scripts/               Image migration tools
tests/                 Additional automated tests
public/                Public static assets, including favicon
```

## Local setup

Use Node.js 24, npm, and a running MySQL server. Clone the repository first:

```sh
git clone https://github.com/nikitamullerr/SafeHer_E-commerce-Project.git
cd SafeHer_E-commerce-Project
```

Install dependencies for both applications from the repository root:

```sh
npm install
npm --prefix backend install
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

### 1. Initialise MySQL

For a **new, empty database**, execute [backend/database/schema.sql](backend/database/schema.sql) using MySQL Workbench or your MySQL client. The script creates and selects `safeher_db` and includes starter catalogue data.

Do not rerun the full schema on an existing database. For managed MySQL, adjust the database creation/selection statements to match your account permissions and database name.

The backend also checks for required order and safety columns/tables at startup. Its database account needs the corresponding schema permissions.

### 2. Configure the backend

Copy [backend/.env.example](backend/.env.example) to `backend/.env`. Set at least:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=safeher_db
JWT_SECRET=replace_with_a_long_random_secret
FRONTEND_URL=http://localhost:5173
```

Use your actual MySQL port. `FRONTEND_URL` supports comma-separated origins; put the main frontend URL first because payment and reset links use it.

### 3. Configure the frontend

Create `.env` in the repository root:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Google sign-in requires the matching `GOOGLE_CLIENT_ID` in the backend and the frontend origin registered in your Google OAuth settings. Email/password login can be used without Google sign-in.

Only public configuration belongs in `VITE_*` variables: Vite embeds these values in the frontend build. Keep database passwords, email credentials, payment secrets, and ImgBB keys in the backend environment.

### 4. Run the applications

In one terminal:

```sh
npm --prefix backend run dev
```

In a second terminal:

```sh
npm run dev
```

Open the address printed by Vite, normally `http://localhost:5173`. The API normally runs at `http://localhost:5000/api`.

Check backend availability at:

```text
GET /api/health
GET /api/health/database
```

## Admin access

For the local development admin account, open `/admin` and sign in with:

```text
Email: adminsafeher@gmail.com
Password: admin_safeher123
```

Change these credentials before deploying a public environment.

In Windows PowerShell, run:

```powershell
cd backend
npm.cmd run setup:admin
```

The command prompts for an email and password and stores a bcrypt hash in MySQL. It creates an admin account or resets an existing admin's password; it does not promote an existing customer account. Use at least 12 password characters.

Open `/admin` on the frontend or use the admin sign-in link. Admin routes verify the authenticated user's database role.

## Payments

Configure the backend for sandbox testing:

```env
PAYFAST_SANDBOX=true
PAYFAST_MERCHANT_ID=your_sandbox_merchant_id
PAYFAST_MERCHANT_KEY=your_sandbox_merchant_key
PAYFAST_PASSPHRASE=
PAYFAST_NOTIFY_URL=https://your-backend.example/api/payments/payfast/itn
```

Set a passphrase only when it matches the merchant configuration.

PayFast orders remain pending until the backend verifies the payment notification, including its signature, provider validation, and amount. Returning to the success page alone does not confirm payment. Premium access is activated after the verified PayFast payment is committed.

For local PayFast testing, expose the backend through an HTTPS tunnel and use its public address in `PAYFAST_NOTIFY_URL`. Once the backend is hosted, use its hosted URL instead of a local tunnel.

Product delivery is free when the subtotal is **strictly greater than R500**. Packages have no delivery charge.

**Current limitation:** the direct card, EFT, bank-transfer, and wallet paths record orders as paid without an external payment processor verifying collection. They are demonstration/manual flows, not evidence that money was transferred. Use the verified PayFast flow for gateway payment testing.

## Email configuration

### EmailJS

```env
EMAIL_SERVICE=emailjs
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_TEMPLATE_ID=your_order_template_id
EMAILJS_GENERAL_TEMPLATE_ID=your_password_reset_template_id
EMAILJS_PRIVATE_KEY=
```

Enable requests from non-browser applications in EmailJS. Set the private key if private-key authorization is enabled on your account.

For the order template, set **To Email** to `{{email}}` and **Subject** to `{{subject}}`. Available variables are:

| Variable | Value |
| --- | --- |
| `customer_name` | Customer name |
| `order_number` | Order reference |
| `orders` | Item list with `name`, `units`, and unit `price` |
| `delivery_method` | Delivery choice or digital access |
| `delivery_address` | Saved order address |
| `cost.shipping` | Delivery fee |
| `total` | Order total |
| `email` / `to_email` | Recipient email |

Use `R` for rand amounts in the template. For password reset/general emails, use recipient `{{email}}`, subject `{{subject}}`, and body `{{message}}`. The general template is separate from the order template.

The EmailJS integration omits PDF attachments. A successful sending response means the provider accepted the request; it does not guarantee inbox delivery. Failed order emails can be retried from order history.

### SMTP

```env
EMAIL_SERVICE=smtp
EMAIL_HOST=your_smtp_host
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_smtp_user
EMAIL_PASSWORD=your_smtp_password
EMAIL_FROM=SafeHer <your_sender@example.com>
```

For Gmail SMTP, use an app password. Your hosting environment must permit outbound SMTP connections. The SMTP path supports PDF order receipts.

## ImgBB images

Set `IMGBB_API_KEY` in the backend environment. In **Admin → Products → Add/Edit**, upload a PNG, JPEG, or WebP file up to 5 MB, then save the product. Uploading fills the image URL; saving persists it in MySQL.

You can also paste a direct HTTPS `i.ibb.co` image URL. An `ibb.co` viewer page is not a direct image URL. The image remains hosted on ImgBB even when the original uploaded file is PNG or JPEG.

[shared/hosted-images.json](shared/hosted-images.json) contains the migrated image URLs. [shared/productImage.js](shared/productImage.js) maps legacy catalogue paths to hosted images, and the landing page uses the same manifest.

For an existing database with local image paths, run [backend/database/migrate-imgbb.sql](backend/database/migrate-imgbb.sql). This updates matching paths without replacing product names or prices. Products with no matching image still need an upload through the admin editor.

**Commit both shared image files.** Missing `shared/productImage.js` or its JSON manifest prevents backend startup. The ImgBB API key must never be included in either file.

## API overview

All routes below are relative to `/api`. Protected routes require `Authorization: Bearer <token>`.

| Prefix | Purpose |
| --- | --- |
| `/auth` | Registration, login, Google authentication, profile, password reset |
| `/products` | Public product catalogue |
| `/orders` | Customer orders and confirmation email retries |
| `/payments` | Payment configuration, checkout, status, retry, PayFast notifications |
| `/addresses` | Saved delivery addresses |
| `/premium` | Plans, subscriptions, lessons, and progress |
| `/reviews` | Reviews and testimonials |
| `/safety-hub` | Safety contacts and activity |
| `/admin` | Admin login and management endpoints |

See [backend/routes](backend/routes) for exact methods, paths, and access requirements.

## Database records

MySQL stores users, categories, products, order items, saved addresses, product reviews, testimonials, emergency contacts, check-ins, lessons, lesson progress, and premium subscriptions. Payment and delivery status are stored on orders; there is no separate deliveries table in the supplied schema.

## Useful scripts

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the frontend development server |
| `npm --prefix backend run dev` | Start the backend with automatic reload |
| `npm --prefix backend start` | Start the backend without automatic reload |
| `npm run build` | Build the frontend for deployment |
| `npm run preview` | Preview the frontend build locally |
| `npm test` | Run Node test suites |

## Build and tests

From the repository root:

```sh
npm test
npm run build
npm run preview
```

The Node test suites cover catalogue handling, payment logic, Google authentication, addresses, subscriptions, language configuration, and view access. Additional browser-check scripts live in `tests/*.browser.mjs`; these are not included in `npm test` and require their own browser tooling and running application.

`build` produces `dist/`. `preview` serves that frontend build locally; it does not start the API. Automated tests do not establish that live payment notifications, email delivery, or external image uploads are working. Test those separately with your configured services.

## Deployment

### Backend on Render

- Root directory: `backend`.
- Build command: `npm install`.
- Start command: `node server.js`.
- Configure backend environment variables in Render, including database, frontend URL, payment, email, and image-hosting settings.
- Keep the repository's `shared/` directory included: the backend imports modules from it.

### Frontend on Render

- Root directory: repository root.
- Build command: `npm install && npm run build`.
- Publish directory: `dist`.
- Set `VITE_API_URL` to the hosted backend URL ending in `/api`.
- Add an SPA rewrite from `/*` to `/index.html` so direct navigation and payment return URLs load the app.

Redeploy the frontend when changing `VITE_*` variables. Local `.env` edits do not update Render's environment.

### Database on Aiven

Use the host, port, database name, and credentials supplied for your MySQL service. The current [database configuration](backend/config/db.js) does not configure TLS certificates; add the TLS/CA settings required by your managed database before relying on a TLS-required connection. Do not disable certificate verification to work around connection errors.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Backend cannot find `shared/productImage.js` | Commit and push the module and hosted-image manifest with the backend changes. |
| Images are missing | Check stored URLs, run the ImgBB migration, and deploy both applications. |
| API cannot be reached | Check backend health, `VITE_API_URL`, and allowed frontend origins. |
| Payment stays pending | Check the public PayFast notification URL and backend verification logs. |
| EmailJS rejects an email | Read the logged status/reason; verify template IDs, recipient variables, keys, and non-browser access. |
| Password reset email fails | Check the general EmailJS template or SMTP configuration and frontend reset-link origin. |
| Database startup fails | Check host, port, credentials, schema permissions, and provider TLS requirements. |

Never commit `.env` files or real credentials. Example configuration files contain placeholders only.



## Project documentation

- [Getting started](GETTING_STARTED.md)
- [Documentation index](DOCUMENTATION_INDEX.md)
- [Implementation summary](IMPLEMENTATION_SUMMARY.md)
- [Deployment checklist](DEPLOYMENT_CHECKLIST.md)
- [Payment setup and testing](backend/PAYMENTS.md)
- [Password reset](backend/PASSWORD_RESET.md)
- [Email system setup](EMAIL_SYSTEM_SETUP.md)
- [Email test guide](EMAIL_TEST_GUIDE.md)
- [Delivery summary](DELIVERY_SUMMARY.md)
- [Translation documentation](src/translations/README.md)

Some supporting guides describe earlier implementations. Use this README and the current source code to confirm the active email provider, checkout behaviour, and deployment settings.

## License

No license file is currently included in this repository. Contact the project team to clarify permitted use and redistribution.

## Contact

For questions, support, or collaboration, contact the SafeHer contributors listed above.
