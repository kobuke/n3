"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="h-full w-full bg-muted animate-pulse rounded-md" />;

    return (
        <MapContainer center={center} zoom={zoom} className="h-full w-full rounded-md z-0" style={{ height: "400px", width: "100%", zIndex: 0 }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={center} radius={radius} onLocationChange={onLocationChange} readOnly={readOnly} />
        </MapContainer>
    );
}
