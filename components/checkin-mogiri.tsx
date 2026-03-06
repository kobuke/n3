"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { CheckCircle2, Fingerprint, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// ----- 型定義 -----

type MogiriStep =
    | "ready"       // 指紋タッチ待ち
    | "holding"     // 指紋タッチ中（2秒カウント）
    | "swipeable"   // スワイプ可能
    | "processing"  // API呼び出し中
    | "success"     // チェックイン完了
    | "error";      // エラー

interface CheckinMogiriProps {
    nftId: string;
    contractAddress: string;
    walletAddress: string;
    onComplete: () => void;
    onCancel: () => void;
}

// ----- 定数 -----

const HOLD_DURATION_MS = 2000;
const SWIPE_THRESHOLD = 0.8; // 80%で確定

// ----- コンポーネント -----

export function CheckinMogiri({
    nftId,
    contractAddress,
    walletAddress,
    onComplete,
    onCancel,
}: CheckinMogiriProps) {
    const [step, setStep] = useState<MogiriStep>("ready");
    const [holdProgress, setHoldProgress] = useState(0);
    const [swipeProgress, setSwipeProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");

    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
    const holdStartRef = useRef<number>(0);
    const animFrameRef = useRef<number>(0);

    const sliderRef = useRef<HTMLDivElement>(null);
    const knobRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStartX = useRef(0);

    // ----- 指紋タッチ処理 -----

    const startHold = useCallback(() => {
        if (step !== "ready") return;
        setStep("holding");
        holdStartRef.current = Date.now();

        const updateProgress = () => {
            const elapsed = Date.now() - holdStartRef.current;
            const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
            setHoldProgress(progress);

            if (progress >= 1) {
                // 2秒経過 — スワイプ可能に
                setStep("swipeable");
                setHoldProgress(1);
                // 振動フィードバック
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
                return;
            }
            animFrameRef.current = requestAnimationFrame(updateProgress);
        };
        animFrameRef.current = requestAnimationFrame(updateProgress);
    }, [step]);

    const cancelHold = useCallback(() => {
        if (step !== "holding") return;
        cancelAnimationFrame(animFrameRef.current);
        setStep("ready");
        setHoldProgress(0);
    }, [step]);

    // ----- スワイプ処理 -----

    const getSliderWidth = () => {
        if (!sliderRef.current || !knobRef.current) return 1;
        return sliderRef.current.offsetWidth - knobRef.current.offsetWidth;
    };

    const handleDragStart = (clientX: number) => {
        if (step !== "swipeable") return;
        isDragging.current = true;
        dragStartX.current = clientX;
    };

    const handleDragMove = (clientX: number) => {
        if (!isDragging.current) return;
        const maxSwipe = getSliderWidth();
        const delta = Math.max(0, Math.min(clientX - dragStartX.current, maxSwipe));
        setSwipeProgress(delta / maxSwipe);
    };

    const handleDragEnd = () => {
        if (!isDragging.current) return;
        isDragging.current = false;

        if (swipeProgress >= SWIPE_THRESHOLD) {
            // チェックイン確定
            setSwipeProgress(1);
            executeCheckin();
        } else {
            // リセット
            setSwipeProgress(0);
        }
    };

    // Touch handlers
    const onTouchStart = (e: React.TouchEvent) =>
        handleDragStart(e.touches[0].clientX);
    const onTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        handleDragMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleDragEnd();

    // Mouse handlers (for desktop testing)
    const onMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientX);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
        const onMouseUp = () => handleDragEnd();

        if (step === "swipeable") {
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [step, swipeProgress]);

    // ----- API呼び出し -----

    const executeCheckin = async () => {
        setStep("processing");

        try {
            const res = await fetch("/api/use-ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nftId,
                    walletAddress,
                    contractAddress,
                    selfCheckin: true,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "チェックインに失敗しました");
            }

            setStep("success");
            // 振動フィードバック
            if (navigator.vibrate) {
                navigator.vibrate([200]);
            }

            // 2秒後にコールバック
            setTimeout(() => onComplete(), 2000);
        } catch (err: any) {
            setErrorMessage(err.message);
            setStep("error");
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            cancelAnimationFrame(animFrameRef.current);
            if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        };
    }, []);

    // ----- レンダリング -----

    // 成功画面
    if (step === "success") {
        return (
            <Card className="shadow-xl border-green-500/30 bg-green-500/5">
                <CardContent className="p-8 flex flex-col items-center gap-5">
                    <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center animate-in zoom-in duration-300">
                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-foreground">
                            チェックイン完了
                        </h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            チケットが正常に使用されました
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // エラー画面
    if (step === "error") {
        return (
            <Card className="shadow-xl border-destructive/30 bg-destructive/5">
                <CardContent className="p-8 flex flex-col items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-destructive" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-foreground">エラー</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            {errorMessage}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setStep("ready");
                            setHoldProgress(0);
                            setSwipeProgress(0);
                        }}
                        className="text-sm text-primary underline mt-2"
                    >
                        再試行
                    </button>
                </CardContent>
            </Card>
        );
    }

    // 処理中画面
    if (step === "processing") {
        return (
            <Card className="shadow-xl border-primary/30 bg-primary/5">
                <CardContent className="p-10 flex flex-col items-center gap-5">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-sm font-medium text-foreground">
                        チェックイン処理中...
                    </p>
                </CardContent>
            </Card>
        );
    }

    // メイン画面（ready / holding / swipeable）
    const isSwipeable = step === "swipeable";

    return (
        <Card
            className={`shadow-xl transition-all duration-500 ${isSwipeable
                ? "border-green-500/50 bg-gradient-to-b from-green-500/5 to-green-500/10"
                : "border-border/50 bg-gradient-to-b from-card to-muted/20"
                }`}
        >
            <CardContent className="p-6 flex flex-col items-center gap-5">
                {/* 注意メッセージ */}
                <div className="w-full rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-center">
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                        ⚠️ ここからは現地スタッフが対応してください
                    </p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                        お客様自身での操作はお控えください
                    </p>
                </div>

                {/* 指紋タッチエリア */}
                {!isSwipeable && (
                    <>
                        <div className="relative mt-2">
                            {/* プログレスリング */}
                            <svg
                                className="w-32 h-32"
                                viewBox="0 0 120 120"
                            >
                                {/* 背景リング */}
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="54"
                                    fill="none"
                                    stroke="#d1d5db"
                                    strokeWidth="4"
                                    opacity={0.4}
                                />
                                {/* プログレスリング */}
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="54"
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="5"
                                    strokeDasharray={2 * Math.PI * 54}
                                    strokeDashoffset={2 * Math.PI * 54 * (1 - holdProgress)}
                                    strokeLinecap="round"
                                    transform="rotate(-90 60 60)"
                                    style={{ transition: 'none' }}
                                />
                            </svg>
                            {/* 指紋アイコン（タッチ対象） */}
                            <button
                                className={`absolute inset-0 flex items-center justify-center rounded-full transition-all duration-200 ${step === "holding"
                                    ? "scale-95 text-primary"
                                    : "text-muted-foreground hover:text-primary"
                                    }`}
                                onTouchStart={(e) => {
                                    e.preventDefault();
                                    startHold();
                                }}
                                onTouchEnd={cancelHold}
                                onTouchCancel={cancelHold}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    startHold();
                                }}
                                onMouseUp={cancelHold}
                                onMouseLeave={cancelHold}
                            >
                                <Fingerprint
                                    className={`w-16 h-16 transition-all duration-300 ${step === "holding" ? "scale-110" : ""
                                        }`}
                                />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                            {step === "holding"
                                ? "そのまま押し続けてください..."
                                : "指紋マークをタッチしたまま2秒お待ちください"}
                        </p>
                    </>
                )}

                {/* スワイプスライダー */}
                {isSwipeable && (
                    <>
                        <div className="flex items-center gap-2 mt-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                認証完了 — スワイプしてチェックイン
                            </p>
                        </div>

                        <div
                            ref={sliderRef}
                            className="relative w-full h-16 rounded-full bg-green-500/20 overflow-hidden mt-2 select-none border-2 border-green-500/30"
                        >
                            {/* 背景テキスト */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span
                                    className="text-sm font-bold text-green-600/50 dark:text-green-400/50 tracking-wider"
                                    style={{ opacity: 1 - swipeProgress }}
                                >
                                    →  スライドしてチェックイン
                                </span>
                            </div>

                            {/* プログレスバー（塗りつぶし） */}
                            <div
                                className="absolute left-0 top-0 h-full bg-green-500/30 rounded-full transition-none"
                                style={{ width: `${swipeProgress * 100}%` }}
                            />

                            {/* スワイプノブ */}
                            <div
                                ref={knobRef}
                                className="absolute top-1 left-1 w-14 h-14 rounded-full bg-green-500 shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-none touch-none"
                                style={{
                                    transform: `translateX(${swipeProgress * getSliderWidth()}px)`,
                                }}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                                onMouseDown={onMouseDown}
                            >
                                <svg
                                    className="w-6 h-6 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                            </div>
                        </div>
                    </>
                )}

                {/* キャンセルボタン */}
                <button
                    onClick={onCancel}
                    className="text-xs text-muted-foreground underline mt-2"
                >
                    キャンセルして戻る
                </button>
            </CardContent>
        </Card>
    );
}
