"use client";

import { useState } from "react";
import MapPreview from "./MapPreview";
import { GrMapLocation } from "react-icons/gr";
import { IoImageSharp } from "react-icons/io5";

type Props = { mediaUrl?: string; lat?: number; lng?: number };

export default function MediaViewer({ mediaUrl, lat, lng }: Props) {
  const [showMap, setShowMap] = useState(!mediaUrl);
  const hasLocation = typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng);
  const hasImage = typeof mediaUrl === "string" && mediaUrl.startsWith("https://");

  return (
    <div className="group relative aspect-video overflow-hidden rounded-md border border-primary/10">
      {showMap || !hasImage ? (
        hasLocation ? <MapPreview lat={lat} lng={lng} /> : <div className="flex h-full items-center justify-center text-xs text-textMutedDark">No location or image available</div>
      ) : (
        <img src={mediaUrl} alt="Bounty proof" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      )}
      {(hasImage || hasLocation) && (
        <button
          type="button"
          onClick={() => setShowMap((previous) => !previous)}
          disabled={!hasImage || !hasLocation}
          aria-label={showMap ? "Show image" : "Show map"}
          className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-md transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {showMap ? <IoImageSharp /> : <GrMapLocation />}
          {showMap ? "Image" : "Map"}
        </button>
      )}
    </div>
  );
}
