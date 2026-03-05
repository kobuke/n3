"use client";

import { useRouter } from "next/navigation";
import { MapPinOff, ArrowLeft, Settings, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";

export default function LocationGuidePage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-background pb-20">
            <AppHeader showLogout={false} />

            <div className="px-4 py-8 max-w-sm mx-auto">
                <Card className="shadow-lg border-primary/20 bg-gradient-to-b from-primary/5 to-background">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4 text-destructive">
                            <MapPinOff className="w-8 h-8" />
                        </div>
                        <CardTitle className="text-xl font-bold">位置情報が必要です</CardTitle>
                        <CardDescription className="text-sm mt-2">
                            このNFTを受け取るには、ブラウザで位置情報の取得を許可する必要があります。
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-6">
                        <div className="space-y-4">
                            <div className="p-4 border rounded-xl bg-card">
                                <h3 className="font-bold flex items-center gap-2 mb-2 text-sm">
                                    <Smartphone className="w-4 h-4 text-primary" /> iPhone (Safari) の場合
                                </h3>
                                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1.5 ml-1">
                                    <li>本体の「設定」アプリを開く</li>
                                    <li>「プライバシーとセキュリティ」をタップ</li>
                                    <li>「位置情報サービス」をタップ</li>
                                    <li>「SafariのWebサイト」を「使用中のみ」に設定</li>
                                    <li>ブラウザに戻り、ページを再読込する</li>
                                </ol>
                            </div>

                            <div className="p-4 border rounded-xl bg-card">
                                <h3 className="font-bold flex items-center gap-2 mb-2 text-sm">
                                    <Settings className="w-4 h-4 text-primary" /> Android (Chrome) の場合
                                </h3>
                                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1.5 ml-1">
                                    <li>アドレスバー（URL表示部分）の左側にあるアイコン（保護された通信 または 鍵マーク）をタップ</li>
                                    <li>「権限」または「サイトの設定」をタップ</li>
                                    <li>位置情報を「許可」に変更</li>
                                    <li>ページを再読込する</li>
                                </ol>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 mt-2">
                            <Button
                                onClick={() => router.back()}
                                className="w-full h-12 text-base font-bold bg-primary"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                前のページに戻って再試行
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
