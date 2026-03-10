import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/server";
import { getNFTsForWallet } from "@/lib/thirdweb";
import { addRoleToMember, removeRoleFromMember } from "@/lib/discord";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.walletAddress) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const supabase = createAdminClient();

        // 1. Get user's discord link
        const { data: discordUser } = await supabase
            .from("discord_users")
            .select("*")
            .eq("wallet_address", session.walletAddress)
            .single();

        if (!discordUser) {
            return NextResponse.json({ ok: true, skipped: true, reason: "Not linked" });
        }

        // 2. Fetch all active role mappings
        const { data: mappings } = await supabase
            .from("discord_role_mappings")
            .select("*")
            .eq("is_active", true);

        if (!mappings || mappings.length === 0) {
            return NextResponse.json({ ok: true, skipped: true, reason: "No role mappings" });
        }

        // 3a. Fetch transferred (CLAIMED) tickets
        const { data: transfers } = await supabase
            .from("transfer_links")
            .select("tokenid")
            .eq("giveraddress", session.walletAddress)
            .eq("status", "CLAIMED");
        const hiddenTokenIds = new Set(transfers?.map((t: any) => t.tokenid) || []);

        // 3b. Fetch used (mogiri) tickets — keyed by "contractAddress-tokenId"
        const { data: usages } = await supabase
            .from("ticket_usages")
            .select("token_id, contract_address")
            .eq("wallet_address", session.walletAddress)
            .eq("status", "used");
        const usedTokenKeys = new Set(
            usages?.map((u: any) => `${u.contract_address.toLowerCase()}-${u.token_id}`) || []
        );

        // 3c. Fetch mint logs for validity period checking
        const { data: mintLogs } = await supabase
            .from("mint_logs")
            .select("token_id, contract_address, template_id, created_at")
            .ilike("recipient_wallet", session.walletAddress)
            .eq("status", "success");
        const mintLogsMap = new Map<string, { template_id: string | null; created_at: string }>();
        mintLogs?.forEach((ml: any) => {
            if (ml.token_id && ml.contract_address) {
                mintLogsMap.set(
                    `${ml.contract_address.toLowerCase()}-${ml.token_id}`,
                    { template_id: ml.template_id, created_at: ml.created_at }
                );
            }
        });

        // 3d. Fetch templates with validity_days
        const { data: allTemplates } = await supabase
            .from("nft_templates")
            .select("id, validity_days")
            .not("validity_days", "is", null);
        const templateValidityMap = new Map<string, number>();
        allTemplates?.forEach((t: any) => {
            if (t.validity_days) templateValidityMap.set(t.id, t.validity_days);
        });

        // 4. Calculate expected roles
        const expectedRoles = new Set<string>();

        // Group by collection address to minimize RPC calls
        const collections = [...new Set(mappings.map((m: any) => m.collection_address))];

        for (const collection of collections) {
            try {
                const nfts = await getNFTsForWallet(collection, session.walletAddress);
                const validNfts = nfts.filter((nft: any) => {
                    const tokenIdStr = nft.id.toString();
                    const tokenKey = `${collection.toLowerCase()}-${tokenIdStr}`;
                    // 除外: 譲渡済み OR 使用済み(もぎり済み)
                    if (hiddenTokenIds.has(tokenIdStr)) return false;
                    if (usedTokenKeys.has(tokenKey)) return false;
                    // 除外: 有効期限切れ
                    const mintLog = mintLogsMap.get(tokenKey);
                    if (mintLog?.template_id) {
                        const validityDays = templateValidityMap.get(mintLog.template_id);
                        if (validityDays) {
                            const expDate = new Date(mintLog.created_at);
                            expDate.setDate(expDate.getDate() + validityDays);
                            if (new Date() > expDate) return false;
                        }
                    }
                    return true;
                });

                if (validNfts.length > 0) {
                    // User has at least 1 valid NFT from this collection
                    mappings
                        .filter((m: any) => m.collection_address === collection)
                        .forEach((m: any) => expectedRoles.add(m.discord_role_id));
                }
            } catch (err) {
                console.error(`Error fetching NFTs for collection ${collection}:`, err);
            }
        }

        const expectedRoleIds = Array.from(expectedRoles);
        const currentActiveRoles = discordUser.active_roles || [];

        // 5. Compare with DB
        const rolesToAdd = expectedRoleIds.filter(id => !currentActiveRoles.includes(id));
        const rolesToRemove = currentActiveRoles.filter((id: string) => !expectedRoleIds.includes(id));

        if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
            return NextResponse.json({ ok: true, synced: false, reason: "No changes needed" });
        }

        // 6. Execute Discord API calls
        let hasErrors = false;

        for (const roleId of rolesToAdd) {
            try {
                await addRoleToMember(discordUser.discord_user_id, roleId);
            } catch (err: any) {
                console.error(`Failed to add role ${roleId}:`, err);
                hasErrors = true;
            }
        }

        for (const roleId of rolesToRemove) {
            try {
                await removeRoleFromMember(discordUser.discord_user_id, roleId);
            } catch (err) {
                console.error(`Failed to remove role ${roleId}:`, err);
                hasErrors = true;
            }
        }

        // 7. Update DB & Log
        await supabase
            .from("discord_users")
            .update({ active_roles: expectedRoleIds, updated_at: new Date().toISOString() })
            .eq("id", discordUser.id);

        if (rolesToAdd.length > 0) {
            await supabase.from("discord_sync_logs").insert({
                discord_user_id: discordUser.discord_user_id,
                wallet_address: session.walletAddress,
                action: "role_added",
                discord_role_id: rolesToAdd.join(","),
                details: { roles_added: rolesToAdd, expected_roles: expectedRoleIds, has_errors: hasErrors }
            });
        }

        if (rolesToRemove.length > 0) {
            await supabase.from("discord_sync_logs").insert({
                discord_user_id: discordUser.discord_user_id,
                wallet_address: session.walletAddress,
                action: "role_removed",
                discord_role_id: rolesToRemove.join(","),
                details: { roles_removed: rolesToRemove, expected_roles: expectedRoleIds, has_errors: hasErrors }
            });
        }

        return NextResponse.json({
            ok: true,
            synced: true,
            added: rolesToAdd,
            removed: rolesToRemove
        });

    } catch (err: any) {
        console.error("Discord sync error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
