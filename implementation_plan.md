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

## Phase 2: Authentication & Security Enhancement

To address the risk of unauthorized access (impersonation) via simple email/wallet address input:

### 1. Email Authentication (OTP)
- **Goal**: Verify ownership of the email address.
- **Method**: Send a One-Time Password (OTP) to the user's email.
- **Tech Stack**: Resend (Email API) + Redis/Vercel KV (for temporary code storage) or signed cookies.
- **Flow**:
  1. User enters email.
  2. Server generates 6-digit code & sends via Resend.
  3. User enters code.
  4. Server validates code -> Session created.

### 2. Wallet Signature (SIWE)
- **Goal**: Verify ownership of the wallet address.
- **Method**: Sign-In with Ethereum (SIWE).
- **Tech Stack**: `siwe` library + NextAuth (optional) or custom implementation.
- **Flow**:
  1. "Connect Wallet" button clicked.
  2. Frontend requests signature of a unique nonce message.
  3. Server validates signature -> Session created.

### 3. Manual Input Restrictions
- **Goal**: mitigate risk of impersonation via manual address entry.
- **Action**:
  - Restrict "Manual Input" mode to **READ-ONLY** (hide QR codes).
  - Show warning: "To use tickets, please login with Email or Wallet."

### 4. Environment Updates
- **Required**: `RESEND_API_KEY` (for email), `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` (optional).
