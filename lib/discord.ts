/**
 * Discord API utilities for guild management and role assignment.
 * 
 * Required env vars:
 *   DISCORD_CLIENT_ID
 *   DISCORD_CLIENT_SECRET
 *   DISCORD_BOT_TOKEN
 *   DISCORD_GUILD_ID
 *   NEXT_PUBLIC_DISCORD_REDIRECT_URI (e.g. http://localhost:3000/api/auth/discord/callback)
 */

const DISCORD_API = "https://discord.com/api/v10";

// ── OAuth2 ──────────────────────────────────────────────

/** Build the Discord OAuth2 authorization URL */
export function getDiscordAuthUrl(state: string): string {
    const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        redirect_uri: process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI!,
        response_type: "code",
        scope: "identify guilds.join",
        state,
    });
    return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/** Exchange an authorization code for tokens */
export async function exchangeCode(code: string) {
    const res = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID!,
            client_secret: process.env.DISCORD_CLIENT_SECRET!,
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI!,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Discord token exchange failed (${res.status}): ${text}`);
    }
    return res.json() as Promise<{
        access_token: string;
        token_type: string;
        expires_in: number;
        refresh_token: string;
        scope: string;
    }>;
}

/** Refresh an expired access token */
export async function refreshAccessToken(refreshToken: string) {
    const res = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID!,
            client_secret: process.env.DISCORD_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Discord token refresh failed (${res.status}): ${text}`);
    }
    return res.json() as Promise<{
        access_token: string;
        token_type: string;
        expires_in: number;
        refresh_token: string;
        scope: string;
    }>;
}

// ── User Info ───────────────────────────────────────────

/** Get the current user's Discord profile */
export async function getDiscordUser(accessToken: string) {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        throw new Error(`Failed to get Discord user (${res.status})`);
    }
    return res.json() as Promise<{
        id: string;
        username: string;
        discriminator: string;
        avatar: string | null;
        global_name: string | null;
    }>;
}

// ── Guild Member Management ─────────────────────────────

/**
 * Add a user to the guild (server) and optionally assign roles.
 *
 * Uses PUT /guilds/{guild.id}/members/{user.id}
 * - 201 Created  → User was added to the guild (new member)
 * - 204 No Content → User was already a member (updated roles)
 *
 * @param accessToken  User's OAuth2 access token (with guilds.join scope)
 * @param discordUserId  The user's Discord ID
 * @param roleIds  Array of role IDs to assign
 * @returns { status: 201 | 204, isNewMember: boolean }
 */
export async function addUserToGuildWithRoles(
    accessToken: string,
    discordUserId: string,
    roleIds: string[]
): Promise<{ status: number; isNewMember: boolean }> {
    const guildId = process.env.DISCORD_GUILD_ID!;
    const botToken = process.env.DISCORD_BOT_TOKEN!;

    const res = await fetch(
        `${DISCORD_API}/guilds/${guildId}/members/${discordUserId}`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bot ${botToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                access_token: accessToken,
                roles: roleIds,
            }),
        }
    );

    if (res.status === 201) {
        // User was added to the guild with the specified roles
        return { status: 201, isNewMember: true };
    }

    if (res.status === 204) {
        // User is already a member — we need to update roles separately
        // PUT /guilds/{guild.id}/members/{user.id} with 204 does NOT update roles
        // So we must add each role individually
        for (const roleId of roleIds) {
            await addRoleToMember(discordUserId, roleId);
        }
        return { status: 204, isNewMember: false };
    }

    const text = await res.text();
    throw new Error(`Failed to add user to guild (${res.status}): ${text}`);
}

/** Add a single role to a guild member */
export async function addRoleToMember(
    discordUserId: string,
    roleId: string
): Promise<void> {
    const guildId = process.env.DISCORD_GUILD_ID!;
    const botToken = process.env.DISCORD_BOT_TOKEN!;

    const res = await fetch(
        `${DISCORD_API}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
        {
            method: "PUT",
            headers: { Authorization: `Bot ${botToken}` },
        }
    );

    if (!res.ok && res.status !== 204) {
        const text = await res.text();
        throw new Error(`Failed to add role ${roleId} (${res.status}): ${text}`);
    }
}

/** Remove a single role from a guild member */
export async function removeRoleFromMember(
    discordUserId: string,
    roleId: string
): Promise<void> {
    const guildId = process.env.DISCORD_GUILD_ID!;
    const botToken = process.env.DISCORD_BOT_TOKEN!;

    const res = await fetch(
        `${DISCORD_API}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
        {
            method: "DELETE",
            headers: { Authorization: `Bot ${botToken}` },
        }
    );

    if (!res.ok && res.status !== 204) {
        const text = await res.text();
        throw new Error(`Failed to remove role ${roleId} (${res.status}): ${text}`);
    }
}

/** Get all roles in the guild (for the admin settings UI) */
export async function getGuildRoles(): Promise<
    { id: string; name: string; color: number; position: number }[]
> {
    const guildId = process.env.DISCORD_GUILD_ID!;
    const botToken = process.env.DISCORD_BOT_TOKEN!;

    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${botToken}` },
    });

    if (!res.ok) {
        throw new Error(`Failed to get guild roles (${res.status})`);
    }

    const roles = await res.json();
    // Filter out @everyone and bot-managed roles, sort by position
    return roles
        .filter((r: any) => r.name !== "@everyone" && !r.managed)
        .sort((a: any, b: any) => b.position - a.position);
}
