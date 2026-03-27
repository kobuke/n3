import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url)
        const format = searchParams.get('format')

        const supabase = createAdminClient()

        // サーベイ本体（設問情報）を取得
        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('id, title, questions')
            .eq('id', id)
            .single()

        if (surveyError || !survey) {
            return NextResponse.json({ error: 'アンケートが見つかりません' }, { status: 404 })
        }

        // 回答一覧を取得
        const { data: responses, error: responsesError } = await supabase
            .from('survey_responses')
            .select('id, user_email, user_wallet, answers, created_at')
            .eq('survey_id', id)
            .order('created_at', { ascending: false })

        if (responsesError) throw responsesError

        const questions: { id: string; type: string; text: string; options?: string[] }[] = survey.questions || []
        const rows = responses || []

        // CSV形式でエクスポート
        if (format === 'csv') {
            const headers = ['回答日時', 'メールアドレス', 'ウォレット', ...questions.map(q => q.text)]
            const csvRows = rows.map(r => {
                const answers = r.answers as Record<string, string | string[]>
                const cols = questions.map(q => {
                    const val = answers[q.id]
                    if (Array.isArray(val)) return val.join('; ')
                    return val ?? ''
                })
                return [
                    new Date(r.created_at).toLocaleString('ja-JP'),
                    r.user_email,
                    r.user_wallet ?? '',
                    ...cols,
                ]
            })

            const csvContent = [headers, ...csvRows]
                .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n')

            const bom = '\uFEFF'
            return new Response(bom + csvContent, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="survey_${id}_responses.csv"`,
                },
            })
        }

        return NextResponse.json({ survey, responses: rows })
    } catch (error: any) {
        console.error('Error fetching survey responses:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
