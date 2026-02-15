import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    // Basic stats
    const { count: successCount } = await supabase
        .from('mint_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'success')

    const { count: errorCount } = await supabase
        .from('mint_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'error')

    const { data: recentLogs } = await supabase
        .from('mint_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

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

    return NextResponse.json({
        successCount: successCount || 0,
        errorCount: errorCount || 0,
        mappingsCount: mappingsCount || 0,
        recentLogs: recentLogs || [],
        recentErrors: recentErrors || []
    })
}
