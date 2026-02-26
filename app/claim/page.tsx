"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { CheckCircle2, AlertCircle, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function ClaimNFTContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [isClaiming, setIsClaiming] = useState(false);
    const [claimStatus, setClaimStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const { data: session, isLoading: sessionLoading } = useSWR("/api/session", fetcher);

    // If missing token
    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <h2 className="text-xl font-bold mb-2">無効なリンクです</h2>
                <p className="text-muted-foreground">トークンが見つかりません。</p>
            </div>
        );
    }

    const handleClaim = async () => {
        if (!session?.authenticated) {
            router.push("/");
            return;
        }

        try {
            setIsClaiming(true);
            setClaimStatus("idle");
            const res = await fetch("/api/transfer/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "受け取りに失敗しました");

            setClaimStatus("success");
        } catch (err: any) {
            setErrorMessage(err.message);
            setClaimStatus("error");
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 flex flex-col items-center pb-20">
            <Card className="w-full text-center shadow-lg border-border/50">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <Gift className="w-16 h-16 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">NFTチケットのお届け</CardTitle>
                    <CardDescription>
                        誰かからNFTチケットが譲渡されました！
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {claimStatus === "success" ? (
                        <div className="flex flex-col items-center gap-3">
                            <CheckCircle2 className="w-12 h-12 text-green-500" />
                            <p className="font-semibold text-foreground">受け取り完了！</p>
                            <p className="text-sm text-muted-foreground">
                                チケットはあなたのウォレットに移動しました。
                            </p>
                            <Button onClick={() => router.push("/mypage")} className="mt-4 w-full">
                                マイページで確認する
                            </Button>
                        </div>
                    ) : claimStatus === "error" ? (
                        <div className="flex flex-col items-center gap-3">
                            <AlertCircle className="w-12 h-12 text-destructive" />
                            <p className="font-semibold text-foreground">エラーが発生しました</p>
                            <p className="text-sm text-destructive">{errorMessage}</p>
                            <Button onClick={() => router.push("/")} variant="outline" className="mt-4 w-full">
                                トップページへ戻る
                            </Button>
                        </div>
                    ) : (
                        <>
                            {sessionLoading ? (
                                <p className="text-sm text-muted-foreground animate-pulse">読み込み中...</p>
                            ) : !session?.authenticated ? (
                                <div className="flex flex-col gap-3">
                                    <p className="text-sm text-muted-foreground">受け取るにはログインが必要です。</p>
                                    <Button onClick={() => router.push("/")} className="w-full">
                                        ログイン画面へ
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <p className="text-sm text-muted-foreground">
                                        あなたのアカウント ({session.email || session.walletAddress}) でチケットを受け取りますか？
                                    </p>
                                    <Button onClick={handleClaim} disabled={isClaiming} className="w-full">
                                        {isClaiming ? "処理中..." : "チケットを受け取る"}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function ClaimPage() {
    return (
        <div className="min-h-screen bg-background">
            <AppHeader showLogout={false} />
            <main className="pt-2">
                <Suspense fallback={<div className="text-center mt-10">Loading...</div>}>
                    <ClaimNFTContent />
                </Suspense>
            </main>
        </div>
    );
}
