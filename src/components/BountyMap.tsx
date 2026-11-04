"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import axios from "axios";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type Bounty = {
  _id: string;
  username?: string;
  description?: string;
  reward?: number;
  status?: string;
  location?: { lat?: number; lng?: number };
};

export default function BountyMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const fetchBounties = async () => {
      try {
        const response = await axios.get("/api/bounty/all");
        if (active) setBounties(Array.isArray(response.data.bounties) ? response.data.bounties : []);
      } catch (fetchError) {
        console.error("Failed to load bounties:", fetchError);
        if (active) setError("Unable to load bounty locations.");
      }
    };
    void fetchBounties();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      setError("Mapbox is not configured. Add NEXT_PUBLIC_MAPBOX_TOKEN to your environment.");
      return;
    }
    if (!mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [78.9629, 20.5937],
      zoom: 3,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    bounties.forEach((bounty) => {
      const lat = bounty.location?.lat;
      const lng = bounty.location?.lng;
      if (
        typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
        typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180
      ) return;

      const element = document.createElement("button");
      element.type = "button";
      element.setAttribute("aria-label", `Open bounty by ${bounty.username || "Pager user"}`);
      element.className = `h-4 w-4 cursor-pointer rounded-full border-2 border-white ${bounty.status === "completed" ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]" : "bg-primary shadow-[0_0_14px_rgba(134,107,255,0.9)]"}`;

      // Build popup DOM with textContent. Never inject user-generated HTML.
      const popupContent = document.createElement("div");
      popupContent.style.fontFamily = "system-ui";
      popupContent.style.padding = "6px";
      popupContent.style.maxWidth = "220px";
      const title = document.createElement("strong");
      title.textContent = `@${bounty.username || "Pager user"}`;
      const description = document.createElement("p");
      description.style.fontSize = "12px";
      description.textContent = (bounty.description || "No description").slice(0, 120);
      const reward = document.createElement("p");
      reward.style.color = "#866bff";
      reward.style.fontWeight = "600";
      reward.style.fontSize = "12px";
      reward.textContent = `${Number.isFinite(bounty.reward) ? bounty.reward : 0} USDC`;
      const status = document.createElement("p");
      status.style.fontSize = "11px";
      status.style.color = bounty.status === "completed" ? "#22c55e" : "#998dce";
      status.textContent = bounty.status === "completed" ? "Completed" : "Active";
      popupContent.append(title, description, reward, status);

      const marker = new mapboxgl.Marker(element)
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setDOMContent(popupContent))
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [bounties]);

  if (!MAPBOX_TOKEN) {
    return <div className="flex h-[75vh] items-center justify-center p-6 text-center text-sm text-textMutedDark">{error || "Mapbox is not configured."}</div>;
  }

  return (
    <div className="relative">
      {error && <p role="alert" className="absolute left-3 top-3 z-10 rounded-lg bg-white/90 px-3 py-2 text-xs text-red-600">{error}</p>}
      <div ref={mapContainer} className="h-[75vh] w-full" />
    </div>
  );
}
