"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type Props = { lat?: number; lng?: number };

export default function MapPreview({ lat, lng }: Props) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (
      !MAPBOX_TOKEN ||
      !mapElement.current ||
      mapInstance.current ||
      typeof lat !== "number" ||
      !Number.isFinite(lat) ||
      lat < -90 || lat > 90 ||
      typeof lng !== "number" ||
      !Number.isFinite(lng) ||
      lng < -180 || lng > 180
    ) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const dark = document.documentElement.classList.contains("dark");
    const map = new mapboxgl.Map({
      container: mapElement.current,
      style: dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11",
      center: [lng, lat],
      zoom: 12,
      interactive: false,
    });
    mapInstance.current = map;
    const marker = new mapboxgl.Marker({ color: "#866bff" }).setLngLat([lng, lat]).addTo(map);

    return () => {
      marker.remove();
      map.remove();
      mapInstance.current = null;
    };
  }, [lat, lng]);

  if (!MAPBOX_TOKEN || typeof lat !== "number" || typeof lng !== "number") {
    return <div className="flex h-full items-center justify-center bg-black/5 p-4 text-center text-xs text-textMutedDark dark:bg-white/5">Location preview unavailable</div>;
  }

  return <div ref={mapElement} className="h-full w-full" />;
}
