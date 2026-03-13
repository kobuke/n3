"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

// リーフレット自体のデフォルトマーカー表示用修正
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LeafletMapProps {
    center: [number, number];
    radius: number;
    zoom?: number;
    onLocationChange: (lat: number, lng: number) => void;
    readOnly?: boolean;
}

function LocationMarker({ position, radius, onLocationChange, readOnly }: any) {
    const map = useMapEvents({
        click(e) {
            if (readOnly) return;
            onLocationChange(e.latlng.lat, e.latlng.lng);
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position ? (
        <>
            <Marker position={position} />
            <Circle center={position} radius={radius} pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }} />
        </>
    ) : null;
}

export default function LeafletMap({ center, radius, zoom = 15, onLocationChange, readOnly = false }: LeafletMapProps) {
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                onLocationChange(lat, lon);
            } else {
                alert("場所が見つかりませんでした。具体的な地名や住所を試してください。");
            }
        } catch (error) {
            console.error("Geocoding search failed:", error);
            alert("検索に失敗しました。時間をおいて再度お試しください。");
        } finally {
            setIsSearching(false);
        }
    };

    if (!mounted) return <div className="h-full w-full bg-muted animate-pulse rounded-md" />;

    return (
        <div className="flex flex-col gap-2 w-full h-full">
            {!readOnly && (
                <div className="flex gap-2">
                    <Input
                        placeholder="場所を検索 (例: 世田谷区代沢, Paris Eiffel Tower)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="flex-1"
                    />
                    <Button type="button" onClick={handleSearch} disabled={isSearching} size="icon">
                        {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
                    </Button>
                </div>
            )}
            <div className="relative flex-1" style={{ minHeight: "300px" }}>
                <MapContainer center={center} zoom={zoom} className="h-full w-full rounded-md z-0" style={{ height: "100%", width: "100%", zIndex: 0 }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={center} radius={radius} onLocationChange={onLocationChange} readOnly={readOnly} />
                </MapContainer>
                {!readOnly && (
                    <div className="absolute top-2 right-2 z-[1000] bg-white/80 p-1 rounded-sm text-[10px] text-muted-foreground pointer-events-none">
                        地図をクリックして地点を変更
                    </div>
                )}
            </div>
        </div>
    );
}
