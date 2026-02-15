# Setup Instructions

## 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (for admin tasks inside API).
- `SHOPIFY_WEBHOOK_SECRET`: Secret key for Shopify Webhooks validation.
- `CROSSMINT_API_KEY`: API Key for Crossmint ("Server-side API Key" with minting scopes).
- `RESEND_API_KEY`: API Key for Resend (email notifications).
- `ADMIN_EMAIL`: Email address to receive error notifications.

## 2. Database Setup

Run the SQL found in `supabase_schema.sql` in your Supabase SQL Editor to create the necessary tables (`mappings`, `mint_logs`, `audit_logs`) and RLS policies.

## 3. Running the App

```bash
npm run dev
```

Visit `http://localhost:3000/dashboard`.
The default login uses Supabase Auth. You need to create a user in Supabase Authentication or enable Signups.

## 4. Verification

To verify the webhook integration locally:
1. Ensure your local server is running.
2. Update `verify_webhook.js` with your `SHOPIFY_WEBHOOK_SECRET` and ensure the `product_id` matches a mapped product in your database.
3. Run the script:

```bash
node verify_webhook.js
```

Check the `mint_logs` table (or the Dashboard "Recent Activity") to see the result.
