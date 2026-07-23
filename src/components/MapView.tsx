"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import type { MapMarker } from "@/lib/api";

// Fix default marker icons (Leaflet bundled assets break under Next.js bundler)
// We use inline SVG data URIs instead so no external image fetch is needed.
const ICON_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">` +
  `<path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 12.4 24.3 13 25a1.3 1.3 0 0 0 2 0c.6-.7 13-15.5 13-25C28 6.27 21.73 0 14 0z" ` +
  `fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/>` +
  `<circle cx="14" cy="14" r="6" fill="#fff"/></svg>`;
const ICON_URL = `data:image/svg+xml;base64,${typeof window !== "undefined" ? btoa(ICON_SVG) : ""}`;

const ICON_SELECTED_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="48" viewBox="0 0 34 48">` +
  `<path d="M17 0C7.61 0 0 7.61 0 17c0 11.5 15 29.5 16 30.5a1.5 1.5 0 0 0 2 0c1-1 16-19 16-30.5C34 7.61 26.39 0 17 0z" ` +
  `fill="#16a34a" stroke="#064e3b" stroke-width="2"/>` +
  `<circle cx="17" cy="17" r="8" fill="#fff"/></svg>`;
const ICON_SELECTED_URL = `data:image/svg+xml;base64,${typeof window !== "undefined" ? btoa(ICON_SELECTED_SVG) : ""}`;

function makeIcon(selected: boolean) {
  return L.icon({
    iconUrl: selected ? ICON_SELECTED_URL : ICON_URL,
    iconSize: selected ? [34, 48] : [28, 40],
    iconAnchor: selected ? [17, 48] : [14, 40],
    popupAnchor: selected ? [0, -42] : [0, -36],
  });
}

type Props = {
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (m: MapMarker) => void;
};

export default function MapView({ markers, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markerByIdRef = useRef<Map<string, L.Marker>>(new Map());

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-2.5, 118],
      zoom: 5,
      scrollWheelZoom: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add a scale bar
    L.control.scale({ imperial: false, metric: true }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Force a recalculation once the container has dimensions
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markerByIdRef.current.clear();
    };
  }, []);

  // Sync markers
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markerByIdRef.current.clear();

    for (const m of markers) {
      if (m.latitude == null || m.longitude == null) continue;
      const isSelected = m.id === selectedId;
      const marker = L.marker([m.latitude, m.longitude], {
        icon: makeIcon(isSelected),
        title: m.lokasi || m.jalanMasuk || "Arsip",
      });

      const popupHtml = `
        <div style="min-width: 220px; font-family: Inter, system-ui, sans-serif; font-size: 13px;">
          <div style="font-weight: 800; color: #111827; margin-bottom: 6px;">
            ${escapeHtml(m.lokasi || "(tanpa kode lokasi)")}
          </div>
          <div style="color: #4b5563; margin-bottom: 2px;">
            <b>Jalan Masuk:</b> ${escapeHtml(m.jalanMasuk || "-")}
          </div>
          <div style="color: #4b5563; margin-bottom: 2px;">
            <b>Provenance:</b> ${escapeHtml(m.provenance || "-")}
          </div>
          <div style="color: #4b5563; margin-bottom: 2px;">
            <b>Jenis:</b> ${escapeHtml(m.jenis || "-")} &nbsp;·&nbsp;
            <b>Media:</b> ${escapeHtml(m.media || "-")}
          </div>
          <div style="color: #4b5563; margin-bottom: 2px;">
            <b>Periode:</b> ${escapeHtml(m.periode || "-")} &nbsp;·&nbsp;
            <b>Bagian:</b> ${escapeHtml(m.bagian || "-")}
          </div>
          <div style="color: #6b7280; margin-top: 6px; font-size: 11px;">
            Klik marker untuk detail
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      marker.on("click", () => onSelect?.(m));
      layer.addLayer(marker);
      markerByIdRef.current.set(m.id, marker);
    }
  }, [markers, selectedId, onSelect]);

  // Fly to selected marker
  useEffect(() => {
    if (!selectedId) return;
    const m = markers.find((x) => x.id === selectedId);
    const marker = markerByIdRef.current.get(selectedId);
    if (m && marker && mapRef.current) {
      mapRef.current.flyTo([m.latitude!, m.longitude!], Math.max(mapRef.current.getZoom(), 10), {
        duration: 0.8,
      });
      marker.openPopup();
    }
  }, [selectedId, markers]);

  // Invalidate size on container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !mapRef.current) return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return useMemo(
    () => (
      <div
        ref={containerRef}
        className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-border bg-muted/30"
        role="application"
        aria-label="Peta lokasi arsip"
      />
    ),
    []
  );
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
