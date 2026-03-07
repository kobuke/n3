import { SurveyForm } from "@/components/admin/surveys/survey-form"
import { PageHeader } from "@/components/admin/page-header"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/admin/ui/button"

export default function NewSurveyPage() {
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
                title="アンケートの作成"
                description="新しいアンケートを作成します"
            />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <SurveyForm />
            </div>
        </div>
    )
}
