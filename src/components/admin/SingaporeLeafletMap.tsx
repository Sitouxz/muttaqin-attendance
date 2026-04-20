"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { REGION_COLOURS } from "@/lib/utils/sg-regions";
import type { SGRegion } from "@/lib/utils/sg-regions";

interface SingaporeLeafletMapProps {
  regions: { name: SGRegion; count: number }[];
}

const REGION_LABELS: Record<SGRegion, string> = {
  Central: "Tengah",
  East: "Timur",
  West: "Barat",
  North: "Utara",
  "North-East": "Timur Laut",
};

// Manually adjusted label positions for better visual placement
const LABEL_OFFSETS: Record<SGRegion, [number, number]> = {
  Central: [1.305, 103.832],
  East: [1.345, 103.955],
  West: [1.345, 103.72],
  North: [1.42, 103.81],
  "North-East": [1.39, 103.895],
};

export function SingaporeLeafletMap({ regions }: SingaporeLeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapRef.current || mapInstanceRef.current) return;

    const regionData = Object.fromEntries(regions.map((r) => [r.name, r.count]));
    const maxCount = Math.max(...regions.map((r) => r.count), 1);

    // Create map — no attribution control
    const map = L.map(mapRef.current, {
      center: [1.3521, 103.8198],
      zoom: 12,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
      dragging: true,
      doubleClickZoom: false,
    });
    mapInstanceRef.current = map;

    // Add zoom control top-right
    L.control.zoom({ position: "topright" }).addTo(map);

    // CartoDB Positron — clean, minimal, light theme
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 18, subdomains: "abcd" }
    ).addTo(map);

    // Fetch official URA region GeoJSON
    fetch("/data/sg-regions.json")
      .then((res) => res.json())
      .then((geojsonData) => {
        // Style function for choropleth
        function getStyle(regionName: SGRegion): L.PathOptions {
          const count = regionData[regionName] ?? 0;
          const opacity = count === 0 ? 0.15 : 0.25 + (count / maxCount) * 0.55;
          return {
            fillColor: REGION_COLOURS[regionName],
            fillOpacity: opacity,
            color: REGION_COLOURS[regionName],
            weight: 2,
            opacity: 0.9,
          };
        }

        // Add GeoJSON layer
        const geoLayer = L.geoJSON(geojsonData, {
          style: (feature) => {
            const region = feature?.properties?.region as SGRegion;
            return getStyle(region);
          },
          onEachFeature: (feature, layer) => {
            const region = feature.properties.region as SGRegion;
            const count = regionData[region] ?? 0;
            const label = REGION_LABELS[region];

            // Tooltip on hover
            layer.bindTooltip(
              `<div style="text-align:center;font-family:system-ui,sans-serif;">
                <strong style="font-size:13px;color:#173d35;">${label}</strong><br/>
                <span style="font-size:10px;color:#888;">${region}</span><br/>
                <strong style="font-size:18px;color:${REGION_COLOURS[region]};">${count}</strong>
                <span style="font-size:10px;color:#888;"> peserta</span>
              </div>`,
              {
                permanent: false,
                sticky: true,
                direction: "center",
                className: "sg-region-tooltip",
              }
            );

            // Hover effects
            layer.on({
              mouseover: () => {
                (layer as L.Path).setStyle({
                  ...getStyle(region),
                  weight: 3,
                  fillOpacity: Math.min((getStyle(region).fillOpacity as number) + 0.2, 0.85),
                });
                (layer as L.Path).bringToFront();
              },
              mouseout: () => {
                geoLayer.resetStyle(layer);
              },
            });
          },
        }).addTo(map);

        // Add permanent labels at manually-positioned centers
        Object.entries(LABEL_OFFSETS).forEach(([regionName, [lat, lng]]) => {
          const region = regionName as SGRegion;
          const count = regionData[region] ?? 0;

          const icon = L.divIcon({
            className: "sg-region-label",
            html: `<div style="
              text-align:center;
              font-family:system-ui,sans-serif;
              background:rgba(255,255,255,0.92);
              padding:4px 10px;
              border-radius:8px;
              box-shadow:0 1px 6px rgba(0,0,0,0.12);
              pointer-events:none;
              white-space:nowrap;
              backdrop-filter:blur(4px);
            ">
              <div style="font-size:10px;font-weight:700;color:#173d35;letter-spacing:0.3px;">${REGION_LABELS[region]}</div>
              <div style="font-size:15px;font-weight:800;color:${REGION_COLOURS[region]};line-height:1.1;">${count}</div>
            </div>`,
            iconSize: [80, 40],
            iconAnchor: [40, 20],
          });

          L.marker([lat, lng], { icon, interactive: false }).addTo(map);
        });

        // Fit bounds to Singapore with padding
        map.fitBounds(geoLayer.getBounds().pad(0.02));
      })
      .catch(() => {
        // Fallback: just show the map centered on Singapore
      });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mounted, regions]);

  if (!mounted) {
    return (
      <div className="w-full h-[400px] bg-[#f8fafb] rounded-xl flex items-center justify-center">
        <span className="text-sm text-[#173d35]/50">Loading map...</span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .sg-region-tooltip {
          background: white !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 10px !important;
          padding: 8px 12px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
        }
        .sg-region-tooltip::before {
          display: none !important;
        }
        .sg-region-label {
          background: none !important;
          border: none !important;
        }
        .leaflet-control-attribution {
          display: none !important;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-[400px] rounded-xl overflow-hidden border border-[#f0f4f3]" />
    </>
  );
}
