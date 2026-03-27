import { SurveyResponses } from "@/components/admin/surveys/survey-responses"
import { PageHeader } from "@/components/admin/page-header"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/admin/ui/button"

export default async function SurveyResponsesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <div className="flex flex-col">
            <div className="px-6 pt-6">
                <Link href="/staff/surveys">
                    <Button variant="ghost" size="sm" className="-ml-4 text-muted-foreground">
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        一覧に戻る
                    </Button>
                </Link>
            </div>
            <PageHeader
                title="アンケート回答結果"
                description="ユーザーの回答内容を確認・エクスポートできます"
            />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <SurveyResponses surveyId={id} />
            </div>
        </div>
    )
}
