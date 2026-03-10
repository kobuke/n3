"use client";

import React, { useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";

export function PullToRefresh({
    onRefresh,
    children,
}: {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}) {
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const MAX_PULL = 100;
    const THRESHOLD = 60;

    useEffect(() => {
        if (isPulling) {
            document.body.style.overscrollBehaviorY = "none";
        } else {
            document.body.style.overscrollBehaviorY = "auto";
        }
        return () => {
            document.body.style.overscrollBehaviorY = "auto";
        };
    }, [isPulling]);

    const onTouchStart = (e: React.TouchEvent) => {
        // スクロール位置が一番上の時だけプルリフレッシュを開始
        if (window.scrollY === 0) {
            setStartY(e.touches[0].clientY);
            setIsPulling(true);
        }
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!isPulling || isRefreshing) return;

        const y = e.touches[0].clientY;
        const diff = y - startY;

        if (diff > 0) {
            // 下に引っ張っている場合
            if (e.cancelable) {
                e.preventDefault();
            }
            setCurrentY(Math.min(diff, MAX_PULL));
        }
    };

    const onTouchEnd = async () => {
        if (!isPulling) return;
        setIsPulling(false);

        if (currentY > THRESHOLD && !isRefreshing) {
            setIsRefreshing(true);
            setCurrentY(THRESHOLD); // 更新中は一定の高さを維持
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setCurrentY(0);
            }
        } else {
            setCurrentY(0);
        }
    };

    const pullDistance = currentY;
    const progress = Math.min(pullDistance / THRESHOLD, 1);

    return (
        <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="relative"
        >
            <div
                className="absolute w-full flex justify-center left-0 z-40"
                style={{
                    top: `-${THRESHOLD}px`,
                    transform: `translateY(${pullDistance}px)`,
                    transition: isPulling ? "none" : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
            >
                <div
                    className="bg-white rounded-full p-2.5 shadow-md border border-slate-100 flex items-center justify-center text-primary"
                    style={{
                        transform: `rotate(${progress * 360}deg)`,
                        opacity: progress > 0.1 ? progress : 0,
                        transition: isPulling ? "none" : "all 0.3s ease",
                    }}
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
                </div>
            </div>

            <div
                style={{
                    transform: `translateY(${isRefreshing ? THRESHOLD : (isPulling ? pullDistance : 0)}px)`,
                    transition: isPulling ? "none" : "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
            >
                {children}
            </div>
        </div>
    );
}
