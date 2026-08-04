"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MapPin,
  AlertCircle,
  FileImage,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
} from "lucide-react";

// ─── SVG host that writes innerHTML imperatively ───────────────────────────
// Bypass React's reconciliation for the SVG content by setting innerHTML
// directly via ref. This prevents React from wiping our highlight/rack CSS
// classes (added by the highlight effect) when the parent re-renders due to
// unrelated state changes (popup open/close, zoom, pan, etc.).
const DenahSvgHost = forwardRef<
  HTMLDivElement,
  { svgText: string; className?: string }
>(function DenahSvgHost({ svgText, className }, ref) {
  const lastSvgRef = useRef<string>("");

  const setInnerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
      if (node && lastSvgRef.current !== svgText) {
        lastSvgRef.current = svgText;
        node.innerHTML = svgText;
      }
    },
    [ref, svgText]
  );

  return <div ref={setInnerRef} className={className || "p-4"} />;
});

// ─── Static default floor plans (shipped in /public/denah/) ─────────────────
export const DEFAULT_BUILDINGS = [
  "E5", "F2", "F5", "F6",
  "G2", "G3", "G4", "G5", "G6", "G7", "G8",
] as const;

export const AVAILABLE_BUILDINGS = DEFAULT_BUILDINGS;

export const ALL_BUILDINGS = [
  "E3", "E4", "E5", "E6", "E7",
  "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9",
  "G2", "G3", "G4", "G5", "G6", "G7", "G8",
] as const;

// ─── Parse a location code like "G2.R1", "G5.R201", "F4.R8.SAF9" ─────────
export type ParsedLokasi = {
  building: string;
  rackCode: string;
  raw: string;
};

export function parseLokasi(raw: string | null | undefined): ParsedLokasi | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, "");
  const m = s.match(/^([A-Z])(\d+)[.\-]([A-Z]+)?(\d+)(.*)$/);
  if (!m) return null;
  const building = `${m[1]}${m[2]}`;
  const rackPrefix = m[3] || "R";
  const rackNum = m[4];
  const rest = m[5] || "";
  return {
    building,
    rackCode: `${rackPrefix}${rackNum}`,
    raw: `${building}.${rackPrefix}${rackNum}${rest}`,
  };
}

// ─── Module-level cache of available buildings ────────────────────────────
let availableBuildingsCache: string[] = [...DEFAULT_BUILDINGS];
const availableBuildingsListeners = new Set<() => void>();

export function getAvailableBuildings(): string[] {
  return availableBuildingsCache;
}

export function subscribeAvailableBuildings(cb: () => void): () => void {
  availableBuildingsListeners.add(cb);
  return () => availableBuildingsListeners.delete(cb);
}

function setAvailableBuildings(next: string[]) {
  const sorted = Array.from(new Set([...DEFAULT_BUILDINGS, ...next])).sort();
  if (
    sorted.length !== availableBuildingsCache.length ||
    sorted.some((b, i) => b !== availableBuildingsCache[i])
  ) {
    availableBuildingsCache = sorted;
    availableBuildingsListeners.forEach((cb) => cb());
  }
}

export async function refreshAvailableBuildings(): Promise<string[]> {
  try {
    const res = await fetch("/api/denah/list");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    setAvailableBuildings(json.buildings || []);
    return availableBuildingsCache;
  } catch {
    return availableBuildingsCache;
  }
}

export function hasDenah(building: string | null | undefined): boolean {
  if (!building) return false;
  return availableBuildingsCache.includes(building.toUpperCase());
}

function rackCodeToSvgId(rackCode: string): string | null {
  const cleaned = String(rackCode).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!/^(r|rk|rb|ra|ry)\d+$/.test(cleaned)) return null;
  return cleaned;
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 5;
const ZOOM_STEP = 1.25;

type Props = {
  lokasi?: string | null;
  initialBuilding?: string;
  onRackClick?: (lokasiCode: string) => void;
  /** Optional override rack code to highlight (takes precedence over `lokasi`) */
  highlightRackCode?: string | null;
};

export default function DenahView({ lokasi, initialBuilding, onRackClick, highlightRackCode }: Props) {
  const parsed = useMemo(() => parseLokasi(lokasi), [lokasi]);
  const clickedParsed = useMemo(
    () => parseLokasi(highlightRackCode),
    [highlightRackCode]
  );

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    return subscribeAvailableBuildings(() => forceUpdate((n) => n + 1));
  }, []);

  useEffect(() => {
    refreshAvailableBuildings();
  }, []);

  const availableList = getAvailableBuildings();

  const defaultBuilding = useMemo(() => {
    if (clickedParsed && hasDenah(clickedParsed.building)) return clickedParsed.building;
    if (parsed && hasDenah(parsed.building)) return parsed.building;
    if (initialBuilding && hasDenah(initialBuilding)) return initialBuilding.toUpperCase();
    return availableList[0] || "G2";
  }, [parsed, clickedParsed, initialBuilding, availableList]);

  const [activeBuilding, setActiveBuilding] = useState<string>(defaultBuilding);

  useEffect(() => {
    const target = clickedParsed || parsed;
    if (target && hasDenah(target.building) && target.building !== activeBuilding) {
      setActiveBuilding(target.building);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [parsed, clickedParsed, activeBuilding]);

  const [svgText, setSvgText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Highlight set: prefer the clicked rack, fall back to the selected detail's rack.
  const highlightIds = useMemo(() => {
    const candidates = [clickedParsed, parsed];
    const ids: string[] = [];
    for (const c of candidates) {
      if (!c || c.building !== activeBuilding) continue;
      const svgId = rackCodeToSvgId(c.rackCode);
      if (svgId && !ids.includes(svgId)) ids.push(svgId);
    }
    return ids;
  }, [parsed, clickedParsed, activeBuilding]);

  const loadSvg = useCallback(async (building: string) => {
    if (!hasDenah(building)) {
      setSvgText("");
      setError(`Denah untuk gedung ${building} belum tersedia. Admin dapat mengunggah SVG via tombol "Upload denah".`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const file = `/denah/denah_${building.toLowerCase()}.svg`;
      const res = await fetch(file);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      setSvgText(text);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } catch (e: any) {
      setSvgText("");
      setError(e?.message || "Gagal memuat denah");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSvg(activeBuilding);
  }, [activeBuilding, loadSvg]);

  // Apply highlights + scroll-to-rack after SVG renders.
  // Re-runs whenever svgText changes (new building loaded) OR highlightIds
  // changes (user clicked a different rack / selected a different row).
  useEffect(() => {
    if (!svgText || !svgHostRef.current) return;
    const host = svgHostRef.current;
    const svg = host.querySelector("svg");
    if (!svg) return;

    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");
    svg.style.maxWidth = "none";
    svg.style.display = "block";
    svg.style.margin = "0 auto";
    svg.style.transformOrigin = "center center";

    const styleId = "denah-highlight-style";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        .denah-rack {
          cursor: pointer;
          transition: fill 0.15s ease, stroke 0.15s ease, filter 0.15s ease;
        }
        .denah-rack:hover {
          fill: #CFD16C !important;
          stroke: #8B8730 !important;
          stroke-width: 2 !important;
          filter: none !important;
        }
        .denah-rack.denah-highlight {
          fill: #BA5D5D !important;
          stroke: #7A3D3D !important;
          stroke-width: 3 !important;
          filter: drop-shadow(0 0 8px rgba(186, 93, 93, 0.6));
        }
        .denah-rack.denah-highlight:hover {
          fill: #A04D4D !important;
          stroke: #5F2D2D !important;
          stroke-width: 3 !important;
          filter: drop-shadow(0 0 10px rgba(160, 77, 77, 0.7));
        }
      `;
      document.head.appendChild(styleEl);
    }

    // Tag all rack elements (re-applied every time in case SVG was reloaded)
    const allRackEls = svg.querySelectorAll("[id]");
    allRackEls.forEach((el) => {
      const id = el.getAttribute("id") || "";
      if (/^(r|rk|rb|ra|ry)\d+$/i.test(id)) {
        el.classList.add("denah-rack");
      }
    });

    // Clear previous highlights
    svg.querySelectorAll(".denah-highlight").forEach((el) =>
      el.classList.remove("denah-highlight")
    );

    // Apply new highlights
    let scrollTarget: Element | null = null;
    for (const rid of highlightIds) {
      const el =
        svg.querySelector(`#${CSS.escape(rid)}`) ||
        svg.querySelector(`#${CSS.escape(rid.toUpperCase())}`);
      if (el) {
        el.classList.add("denah-highlight");
        scrollTarget = el;
      }
    }

    if (scrollTarget) {
      setTimeout(() => {
        (scrollTarget as Element).scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }, 200);
    }
  }, [svgText, highlightIds]);

  // Apply zoom & pan transform to the SVG element
  useEffect(() => {
    if (!svgHostRef.current) return;
    const svg = svgHostRef.current.querySelector("svg");
    if (!svg) return;
    svg.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  }, [zoom, pan, svgText]);

  // Click delegation (capture phase)
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      let el: Element | null = target;
      let attempts = 0;
      while (el && attempts < 10) {
        const id = el.getAttribute && el.getAttribute("id");
        if (id && /^(r|rk|rb|ra|ry)\d+$/i.test(id)) {
          const code = `${activeBuilding}.${id.toUpperCase()}`;
          onRackClick?.(code);
          return;
        }
        el = el.parentElement;
        attempts++;
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [activeBuilding, onRackClick]);

  // Wheel zoom (cursor-anchored)
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!svgHostRef.current) return;
      e.preventDefault();
      const rect = svgHostRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;

      const direction = e.deltaY < 0 ? 1 : -1;
      const factor = direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
      const ratio = newZoom / zoom;

      setPan((prev) => ({
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
      }));
      setZoom(newZoom);
    },
    [zoom]
  );

  // Drag-to-pan
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as Element;
      const isRackPattern = (() => {
        let el: Element | null = target;
        for (let i = 0; i < 5 && el; i++) {
          const id = el.getAttribute && el.getAttribute("id");
          if (id && /^(r|rk|rb|ra|ry)\d+$/i.test(id)) return true;
          el = el.parentElement;
        }
        return false;
      })();

      if (e.button === 0 && isRackPattern) return;
      if (e.button !== 0 && e.button !== 1) return;

      svgHostRef.current?.setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [pan]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    },
    [isDragging]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging) {
        svgHostRef.current?.releasePointerCapture(e.pointerId);
        setIsDragging(false);
        dragStartRef.current = null;
      }
    },
    [isDragging]
  );

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_STEP));
  }, []);
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Building selector + info bar */}
      <div className="flex items-center justify-between gap-2 p-2 sm:p-3 border-b bg-muted/30 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <FileImage className="size-4 text-[#BA5D5D] shrink-0" />
          <span className="text-sm font-medium hidden sm:inline">Denah Rak</span>
          {parsed && (
            <Badge variant="outline" className="font-mono text-xs">
              {parsed.building}.{parsed.rackCode}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={activeBuilding} onValueChange={(v) => setActiveBuilding(v)}>
            <SelectTrigger className="w-[100px] sm:w-[110px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableList.map((b) => (
                <SelectItem key={b} value={b}>
                  Gedung {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SVG canvas with zoom controls */}
      <div className="flex-1 min-h-0 bg-slate-50 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-sm">Memuat denah {activeBuilding}…</span>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="flex flex-col items-center gap-2 text-[#8B8730]">
              <AlertCircle className="size-8" />
              <p className="text-sm">{error}</p>
              <p className="text-xs text-muted-foreground">
                Denah tersedia untuk: {availableList.join(", ")}
              </p>
            </div>
          </div>
        )}
        {!loading && !error && svgText && (
          <div
            ref={wrapRef}
            className="w-full h-full overflow-hidden relative"
            style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <DenahSvgHost ref={svgHostRef} svgText={svgText} />
          </div>
        )}

        {/* Floating zoom controls */}
        {!error && !loading && svgText && (
          <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 bg-background/95 backdrop-blur border rounded-lg shadow-lg p-1.5 z-20">
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              title="Perbesar (scroll juga bisa)"
            >
              <ZoomIn className="size-4" />
            </Button>
            <div className="text-center text-[10px] font-mono text-muted-foreground py-0.5">
              {Math.round(zoom * 100)}%
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              title="Perkecil"
            >
              <ZoomOut className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={resetView}
              aria-label="Reset view"
              title="Reset tampilan"
            >
              <Maximize2 className="size-4" />
            </Button>
          </div>
        )}

        {/* Hint badge */}
        {!error && !loading && svgText && (
          <div className="absolute top-2 left-2 bg-background/95 backdrop-blur border rounded-md px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1 z-20 pointer-events-none">
            <Move className="size-3" />
            <span className="hidden sm:inline">Geser untuk pan · scroll untuk zoom · klik rak untuk detail</span>
            <span className="sm:hidden">Geser · klik rak</span>
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div className="p-2 border-t border-[#E8E8E8] bg-white flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-[#8B92A5] flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-[#a8d5e5] border border-slate-400" />
          Rak
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-[#CFD16C] border border-[#8B8730]" />
          Hover
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-[#BA5D5D] border border-[#7A3D3D]" />
          Terpilih
        </span>
        {parsed && parsed.building !== activeBuilding && (
          <span className="text-[#8B8730] ml-auto flex items-center gap-1">
            <MapPin className="size-3" />
            Lokasi di gedung {parsed.building}
          </span>
        )}
      </div>
    </div>
  );
}
