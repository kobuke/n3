# Phase 3: Discord Integration Plan

## Objective
Enable users who hold specific NFTs currently authenticated in the web app to automatically join a Discord server and receive specific roles.

## Core Features
1. **Discord OAuth2 Integration**: Allows users to connect their Discord account.
   - Scopes: `identify`, `guilds.join`
2. **Role Assignment**: Automatically assigns roles based on NFT ownership.
3. **Admin Panel**: `/staff/settings` for mapping NFTs to Discord Roles.
4. **Data Persistence**: Introduce a database (Supabase) to store:
   - User Discord IDs (linked to Wallet/Email).
   - NFT Collection <-> Discord Role mappings.
5. **(Optional) Automated Revocation**: Remove roles if NFT is transferred (via Alchemy Webhooks).

## Tech Stack Additions
- **Database**: Supabase (PostgreSQL)
- **Discord API**: `discord.js` or direct REST API calls.
- **Alchemy Webhooks**: For real-time ownership updates (Phase 3.5).

## Implementation Steps

### Step 1: Database Setup (Supabase)
- Create `users` table: links `wallet_address` to `discord_user_id`, `discord_access_token`, `refresh_token`.
- Create `role_mappings` table: links `collection_address` (or token_id) to `discord_role_id`.

### Step 2: Discord OAuth Flow
- Create `/api/auth/discord` (Redirect to Discord).
- Create `/api/auth/discord/callback` (Handle code exchange).
- Store tokens in Supabase.

### Step 3: Role Assignment Logic
- Create utility `assignDiscordRole(userId, roleId)`.
- Use `PUT /guilds/{guild.id}/members/{user.id}` to join/update user.
- Trigger this logic:
  - Immediately after Discord connection.
  - On login (Session refresh).

### Step 4: Admin Panel (`/staff/settings`)
- UI to list current mappings.
- Form to add new mapping (Collection Address -> Role ID).
- Save to Supabase `role_mappings`.

### Step 5: Webhooks (Future/Optional)
- Endpoint `/api/webhooks/alchemy` to listen for transfer events.
- Logic to find user by wallet and remove role.

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (for backend admin tasks)
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
