import { PageHeader } from "@/components/admin/page-header"
import { SurveyList } from "@/components/admin/surveys/survey-list"

export default function SurveysPage() {
    return (
        <div className="flex flex-col">
            <PageHeader
                title="アンケート管理"
                description="ユーザー向けのアンケートを作成し、回答に対するNFT報酬を設定します"
            />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <SurveyList />
            </div>
        </div>
    )
}
