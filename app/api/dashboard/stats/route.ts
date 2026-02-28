import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getWalletBalance } from "thirdweb/wallets"
import { polygon, polygonAmoy } from "thirdweb/chains"
import { client } from "@/lib/thirdweb"

export async function GET() {
    const supabase = createAdminClient()

    // Basic stats
    const { count: successCount } = await supabase
        .from('mint_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'success')

    const { count: errorCount } = await supabase
        .from('mint_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'error')

    // Fetch from three different tables for mixed actual activity
    const { data: recentMints } = await supabase
        .from('mint_logs')
        .select('id, shopify_order_id, status, recipient_email, recipient_wallet, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

    const { data: recentUsages } = await supabase
        .from('ticket_usages')
        .select('id, token_id, wallet_address, status, used_at')
        .order('used_at', { ascending: false })
        .limit(10)

    const { data: recentTransfers } = await supabase
        .from('transfer_links')
        .select('id, token, giverAddress, tokenId, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

    const allActivities: any[] = []

    if (recentMints) {
        recentMints.forEach(m => {
            allActivities.push({
                id: `mint-${m.id}`,
                type: 'mint',
                status: m.status === 'success' ? 'success' : 'failed',
                title: `Minted Order #${m.shopify_order_id}`,
                description: `To: ${m.recipient_email || m.recipient_wallet || 'Unknown'}`,
                date: new Date(m.created_at).getTime(),
                created_at: m.created_at
            })
        })
    }

    if (recentUsages) {
        recentUsages.forEach(u => {
            allActivities.push({
                id: `use-${u.id}`,
                type: 'usage',
                status: u.status === 'used' ? 'success' : 'pending',
                title: `Ticket Used: Token #${u.token_id}`,
                description: `By: ${u.wallet_address.substring(0, 6)}...`,
                date: new Date(u.used_at).getTime(),
                created_at: u.used_at
            })
        })
    }

    if (recentTransfers) {
        recentTransfers.forEach(t => {
            allActivities.push({
                id: `transfer-${t.id}`,
                type: 'transfer',
                status: t.status === 'CLAIMED' ? 'success' : 'pending',
                title: t.status === 'CLAIMED' ? `Transfer Claimed: Token #${t.tokenId}` : `Transfer Link Created: Token #${t.tokenId}`,
                description: `From: ${t.giverAddress.substring(0, 6)}...`,
                date: new Date(t.created_at).getTime(),
                created_at: t.created_at
            })
        })
    }

    // Sort by date desc and take top 10
    allActivities.sort((a, b) => b.date - a.date)
    const recentLogs = allActivities.slice(0, 10).map(a => ({
        id: a.id,
        type: a.type,
        status: a.status,
        title: a.title,
        description: a.description,
        created_at: a.created_at
    }))

    const { data: recentErrors } = await supabase
        .from('mint_logs')
        .select('*')
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(5)

    // Check active mappings count
    const { count: mappingsCount } = await supabase
        .from('mappings')
        .select('*', { count: 'exact', head: true })

    // Check backend wallet balance
    let walletBalance = "0 POL"
    try {
        const chain = process.env.NEXT_PUBLIC_CHAIN_NAME === "polygon-amoy" ? polygonAmoy : polygon
        const address = process.env.THIRDWEB_ENGINE_BACKEND_WALLET
        if (address) {
            const balanceContext = await getWalletBalance({
                client,
                chain,
                address
            })
            // Round to 3 decimal places for readability if needed, or just take string
            walletBalance = `${Number(balanceContext.displayValue).toFixed(3)} ${balanceContext.symbol}`
        }
    } catch (e) {
        console.error("Failed to fetch backend wallet balance:", e)
    }

    return NextResponse.json({
        successCount: successCount || 0,
        errorCount: errorCount || 0,
        mappingsCount: mappingsCount || 0,
        walletBalance: walletBalance,
        recentLogs: recentLogs || [],
        recentErrors: recentErrors || []
    })
}
