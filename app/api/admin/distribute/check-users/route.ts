import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffAuth } from '@/lib/staff-auth'

export async function POST(req: NextRequest) {
    const authError = await requireStaffAuth(req);
    if (authError) return authError;

    try {

        const body = await req.json()
        const { emails } = body

        if (!emails || !Array.isArray(emails)) {
            return NextResponse.json({ error: "Invalid emails array" }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Separate emails and raw wallet addresses
        const rawInputs = emails.map((e: string) => e.trim()).filter(Boolean)
        const walletAddresses = rawInputs.filter(e => e.toLowerCase().startsWith('0x') && e.length === 42)
        const emailAddresses = rawInputs.filter(e => !(e.toLowerCase().startsWith('0x') && e.length === 42)).map(e => e.toLowerCase())

        const uniqueEmails = Array.from(new Set(emailAddresses))
        let users: any[] = []

        if (uniqueEmails.length > 0) {
            const { data, error } = await supabase
                .from('users')
                .select('email, walletaddress')
                .in('email', uniqueEmails)

            if (error) {
                console.error("User check error:", error)
                return NextResponse.json({ error: "Database error" }, { status: 500 })
            }
            users = data || []
        }

        const emailResults = uniqueEmails.map(email => {
            const user = users.find(u => u.email?.toLowerCase() === email)
            const isValid = !!(user && user.walletaddress)
            return {
                email,
                isValid,
                isRegistered: !!user,
                hasWallet: !!user?.walletaddress
            }
        })

        const walletResults = walletAddresses.map(wallet => ({
            email: wallet,
            isValid: true,
            isRegistered: true,
            hasWallet: true
        }))

        return NextResponse.json({ results: [...emailResults, ...walletResults] })
    } catch (e: any) {
        console.error("Check users error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
