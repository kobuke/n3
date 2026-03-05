"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(
    () => import("@/components/admin/spots/leaflet-map"),
    { ssr: false }
);

interface MapPickerProps {
    center: [number, number];
    radius: number;
    zoom?: number;
    onLocationChange: (lat: number, lng: number) => void;
    readOnly?: boolean;
}

export function MapPicker(props: MapPickerProps) {
    return <LeafletMap {...props} />;
}
