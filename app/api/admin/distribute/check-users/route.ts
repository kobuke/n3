import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies()
        const staffSecret = cookieStore.get("nanjo_staff_secret")?.value

        if (staffSecret !== process.env.STAFF_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { emails } = body

        if (!emails || !Array.isArray(emails)) {
            return NextResponse.json({ error: "Invalid emails array" }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Ensure no duplicates in the query, and clean up emails
        const uniqueEmails = Array.from(new Set(emails.map((e: string) => e.trim().toLowerCase()).filter(Boolean)))

        if (uniqueEmails.length === 0) {
            return NextResponse.json({ results: [] })
        }

        const { data: users, error } = await supabase
            .from('users')
            .select('email, walletaddress')
            .in('email', uniqueEmails)

        if (error) {
            console.error("User check error:", error)
            return NextResponse.json({ error: "Database error" }, { status: 500 })
        }

        const results = uniqueEmails.map(email => {
            const user = users?.find(u => u.email.toLowerCase() === email)
            const isValid = !!(user && user.walletaddress)
            return {
                email,
                isValid,
                isRegistered: !!user,
                hasWallet: !!user?.walletaddress
            }
        })

        return NextResponse.json({ results })
    } catch (e: any) {
        console.error("Check users error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
