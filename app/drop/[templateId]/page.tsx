"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { CheckCircle2, AlertCircle, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DropClaimPage({ params }: { params: Promise<{ templateId: string }> }) {
    const { templateId } = use(params);
    const router = useRouter();

    const [isClaiming, setIsClaiming] = useState(false);
    const [claimStatus, setClaimStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const { data: session, isLoading: sessionLoading } = useSWR("/api/session", fetcher);
    const { data: template, isLoading: templateLoading, error: templateError } = useSWR(
        templateId ? `/api/templates/${templateId}` : null,
        fetcher
    );


    const handleClaim = async () => {
        if (!session?.authenticated) {
            router.push("/");
            return;
        }

        setIsClaiming(true);
        setClaimStatus("idle");
        setErrorMessage("");

        try {
            const res = await fetch("/api/drop/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ templateId }),
            });

            const data = await res.json();
            if (!res.ok) {
                setErrorMessage(data.error || "エラーが発生しました。");
                setClaimStatus("error");
            } else {
                setClaimStatus("success");
            }
        } catch (error) {
            setErrorMessage("ネットワークエラーが発生しました。");
            setClaimStatus("error");
        } finally {
            setIsClaiming(false);
        }
    };

    if (sessionLoading || templateLoading) {
        return (
            <main className="min-h-screen bg-background pb-20">
                <AppHeader />
                <div className="flex flex-col items-center justify-center p-6 h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </main>
        );
    }

    if (templateError || (template && template.error)) {
        return (
            <main className="min-h-screen bg-background pb-20">
                <AppHeader />
                <div className="flex flex-col items-center justify-center p-6 text-center mt-20">
                    <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                    <h2 className="text-xl font-bold mb-2">ページが見つかりません</h2>
                    <p className="text-muted-foreground">無効なURLか、配布が終了した可能性があります。<br />QRコードを再度スキャンするか、スタッフにお問い合わせください。</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background pb-20">
            <AppHeader />

            <div className="px-4 py-8 max-w-sm mx-auto">
                <Card className="shadow-lg border-primary/20 bg-gradient-to-b from-primary/5 to-background">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Gift className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold">{template?.name || "記念アイテム"}</CardTitle>
                        <CardDescription className="text-base mt-2">
                            {template?.description || "こちらのデジタルチケット・記念品を受け取ることができます。"}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-6 p-6">
                        {template?.image_url && (
                            <div className="aspect-square w-full rounded-xl overflow-hidden shadow-sm border">
                                <img src={template.image_url} alt={template.name} className="w-full h-full object-cover" />
                            </div>
                        )}

                        {claimStatus === "success" ? (
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="flex flex-col items-center gap-1 text-green-600">
                                    <CheckCircle2 className="w-14 h-14 mb-1" />
                                    <h3 className="font-bold text-xl">受け取り完了！</h3>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    デジタルチケットの受け取りが完了しました。<br />
                                    マイページに表示されるまで、<br />
                                    数十秒から数分かかる場合があります。
                                </p>
                                <Button
                                    className="w-full mt-2 text-base h-12"
                                    onClick={() => router.push("/mypage")}
                                >
                                    マイページで確認する
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {claimStatus === "error" && (
                                    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg text-center font-medium">
                                        {errorMessage}
                                    </div>
                                )}

                                {!session?.authenticated ? (
                                    <div className="flex flex-col gap-4 text-center">
                                        <div className="p-4 bg-muted/50 rounded-xl">
                                            <p className="text-sm font-medium text-foreground mb-1">ログインが必要です</p>
                                            <p className="text-xs text-muted-foreground">チケットを受け取るには、メールアドレスでログインするだけでOKです。</p>
                                        </div>
                                        <Button
                                            className="w-full h-12 text-base font-bold"
                                            size="lg"
                                            onClick={() => router.push("/")}
                                        >
                                            ログインして受け取る →
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        className="w-full text-base font-bold h-14"
                                        onClick={handleClaim}
                                        disabled={isClaiming}
                                    >
                                        {isClaiming ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                受け取り処理中…
                                            </span>
                                        ) : "デジタルチケットを受け取る"}
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
