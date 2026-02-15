# Implementation Plan - Crossmint NFT Wallet App Fixes

This plan outlines the steps to fix potential issues in the Crossmint NFT Wallet application, specifically addressing API connections and QR code scanning reliability.

## User Constraints & Goal
- **Goal**: Fix "broken API connections" and clarify "database connection" issues.
- **Tech Stack**: Next.js (App Router), Crossmint API, Tailwind CSS.
- **Key Requirement**: Robust staff scanning and correct wallet lookup.

## Proposed Changes

### 1. Fix Crossmint API Integration (`lib/crossmint.ts`)
- **Correction**: The wallet lookup URL format `.../wallets/polygon:email:{email}:polygon` is likely incorrect. It should be `{chain}:{email}` or `email:{email}:{chain}`. The prompt specified `/api/v1-alpha1/wallets/polygon:email:{email}`. I will adjust the code to match the prompt's improved format.
- **Action**: Update `getWalletByEmail` function.

### 2. Refactor QR Scanner Component (`components/qr-scanner.tsx`)
- **Problem**: The current implementation uses a manual `video` + `canvas` loop with `jsQR` imported inside a `setInterval`, which is highly inefficient and prone to crashes.
- **Requirement**: The original prompt asked for `html5-qr-scanner`. The `package.json` includes `html5-qrcode`.
- **Action**: Rewrite `QrScanner` to use `html5-qrcode` library for better performance and device compatibility.

### 3. Environment Configuration
- **Problem**: The user mentioned "database connection" issues, likely due to missing environment variables or confusion about the architecture (which relies on detailed API interaction, not a local DB).
- **Action**: Create a `.env.local.example` file to clarify the required keys (`CROSSMINT_API_KEY`, `NEXT_PUBLIC_COLLECTION_ID`, `STAFF_SECRET`).

### 4. Verify Database Assumptions
- **Analysis**: The code does **NOT** use a database. Session is cookie-based.
- **Action**: Clarify to the user that no database connection is needed, reducing complexity.

## Verification Plan

### Automated Tests
- None planned (requires live API keys).

### Manual Verification Steps
1. **Login**: Verify email login triggers correct API call.
2. **Scanner**: Verify `html5-qrcode` initializes camera correctly.
3. **Staff API**: Ensure `use-ticket` endpoint correctly validates `STAFF_SECRET`.
