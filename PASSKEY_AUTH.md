# Passkey Authentication

## Required Supabase SQL

Apply `supabase_passkeys_schema.sql` before enabling Passkey login in production.

## Required Environment Variables

- `SESSION_SECRET`: long random value used to sign the app session cookie.
- `NEXT_PUBLIC_APP_URL`: public origin, for example `https://example.com`.
- `WEBAUTHN_RP_ID`: domain only, for example `example.com`.

## Behavior

- Passkey login is the primary path.
- Email OTP remains available for first-time setup and recovery.
- WebAuthn requires user verification. The browser or OS decides whether that is Face ID, Touch ID, fingerprint, device PIN, or another local unlock method.
- Biometric data never leaves the user's device.
