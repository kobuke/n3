"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { CheckCircle2, AlertCircle, MapPin, Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function SpotDropPage({ params }: { params: Promise<{ id: string }> }) {
    const t = useTranslations('SpotPage');
    const tCommon = useTranslations('Common');
    const tClaim = useTranslations('ClaimPage');
    const { id } = use(params);
    const router = useRouter();
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimStatus, setClaimStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [locationWait, setLocationWait] = useState(false);

    const { data: session, isLoading: sessionLoading } = useSWR("/api/session", fetcher);

    // Spot data
    const { data: spot, isLoading: spotLoading, error: spotError } = useSWR(
        id ? `/api/spots/${id}` : null,
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
            let lat: number | undefined;
            let lng: number | undefined;

            if (spot?.is_location_restricted) {
                setLocationWait(true);
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0
                        });
                    });
                    lat = pos.coords.latitude;
                    lng = pos.coords.longitude;
                } catch (geoError: any) {
                    console.error("Geo error:", geoError);
                    if (geoError.code === 1) { // PERMISSION_DENIED
                        router.push("/guide/location");
                        return;
                    }
                    setErrorMessage(t('error_geo'));
                    setClaimStatus("error");
                    setIsClaiming(false);
                    setLocationWait(false);
                    return;
                }
                setLocationWait(false);
            }

            const res = await fetch("/api/drop/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ spotId: spot.id, lat, lng }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.requiresLocation) {
                    router.push("/guide/location");
                } else if (data.error === "配布終了") {
                    setErrorMessage("配布終了");
                    setClaimStatus("error");
                } else {
                    setErrorMessage(data.error || t('error_default'));
                    setClaimStatus("error");
                }
            } else {
                setClaimStatus("success");
            }
        } catch (error) {
            setErrorMessage(t('error_network'));
            setClaimStatus("error");
        } finally {
            setIsClaiming(false);
            setLocationWait(false);
        }
    };

    if (sessionLoading || spotLoading) {
        return (
            <main className="min-h-screen bg-background pb-20">
                <AppHeader />
                <div className="flex flex-col items-center justify-center p-6 h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </main>
        );
    }

    if (spotError || (spot && spot.error)) {
        return (
            <main className="min-h-screen bg-background pb-20">
                <AppHeader />
                <div className="flex flex-col items-center justify-center p-6 text-center mt-20">
                    <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                    <h2 className="text-xl font-bold mb-2">{t('not_found_title')}</h2>
                    <p className="text-muted-foreground">{t('not_found_desc')}</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background pb-20">
            <AppHeader showLogout={false} />
            <div className="px-4 py-8 max-w-sm mx-auto">
                <Card className="shadow-lg border-primary/20 bg-gradient-to-b from-primary/5 to-background">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                            {spot?.is_location_restricted ? <MapPin className="w-8 h-8" /> : <Navigation className="w-8 h-8" />}
                        </div>
                        <CardTitle className="text-2xl font-bold">{spot?.name}</CardTitle>
                        <CardDescription className="text-base mt-2 whitespace-pre-wrap">
                            {spot?.description || t('default_description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6 p-6">
                        {spot?.nft_templates?.image_url && (
                            <div className="aspect-square w-full rounded-xl overflow-hidden shadow-sm border">
                                <img src={spot.nft_templates.image_url} alt={spot.nft_templates.name} className="w-full h-full object-cover" />
                            </div>
                        )}

                        {claimStatus === "success" ? (
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="flex flex-col items-center gap-1 text-green-600">
                                    <CheckCircle2 className="w-14 h-14 mb-1" />
                                    <h3 className="font-bold text-xl">{tClaim('success_title')}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {tClaim('success_desc')}
                                </p>
                                <Button
                                    className="w-full mt-2 text-base h-12"
                                    onClick={() => router.push("/mypage/nfts")}
                                >
                                    {tClaim('go_to_nfts')}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {claimStatus === "error" && errorMessage === "配布終了" ? (
                                    <div className="p-4 bg-muted text-foreground text-center rounded-lg font-bold border border-border">
                                        配布終了
                                    </div>
                                ) : (
                                    <>
                                        {claimStatus === "error" && (
                                            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg text-center font-medium">
                                                {errorMessage}
                                            </div>
                                        )}

                                        {!session?.authenticated ? (
                                            <div className="flex flex-col gap-4 text-center">
                                                <div className="p-4 bg-muted/50 rounded-xl">
                                                    <p className="text-sm font-medium text-foreground mb-1">{tClaim('login_required')}</p>
                                                </div>
                                                <Button
                                                    className="w-full h-12 text-base font-bold"
                                                    size="lg"
                                                    onClick={() => {
                                                        localStorage.setItem('redirectAfterLogin', `/spot/${id}`);
                                                        router.push("/");
                                                    }}
                                                >
                                                    {tClaim('login_to_claim')}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                className="w-full text-base font-bold h-14"
                                                onClick={handleClaim}
                                                disabled={isClaiming || locationWait}
                                            >
                                                {isClaiming || locationWait ? (
                                                    <span className="flex items-center gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        {locationWait ? t('checking_location') : t('claiming')}
                                                    </span>
                                                ) : t('submit_claim')}
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
