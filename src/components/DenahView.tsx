"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MapPin, AlertCircle, FileImage } from "lucide-react";

// ─── Available floor plans (must match files in /public/denah/) ─────────────
export const AVAILABLE_BUILDINGS = [
  "E5", "F2", "F5", "F6",
  "G2", "G3", "G4", "G5", "G6", "G7", "G8",
] as const;

// ─── Parse a location code like "G2.R1", "G5.R201", "F4.R8.SAF9" ─────────
export type ParsedLokasi = {
  building: string;  // "G2"
  rackCode: string;  // "R1" (uppercase)
  raw: string;
};

export function parseLokasi(raw: string | null | undefined): ParsedLokasi | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, "");
  // Match: <BuildingLetters><Digits>.<RackPrefix?><Digits>[.anything...]
  // Examples: G2.R1, G5.R201, F4.R8.SAF9, G2.RK12, F5.RB3
  const m = s.match(/^([A-Z])(\d+)[.\-]([A-Z]+)?(\d+)(.*)$/);
  if (!m) return null;
  const building = `${m[1]}${m[2]}`;           // "G2"
  const rackPrefix = m[3] || "R";               // "R" | "RK" | "RB" | "RA" | "RY"
  const rackNum = m[4];                          // "1"
  const rest = m[5] || "";                       // ".SAF9" | ""
  return {
    building,
    rackCode: `${rackPrefix}${rackNum}`,
    raw: `${building}.${rackPrefix}${rackNum}${rest}`,
  };
}

// Check if a building has a floor plan SVG
export function hasDenah(building: string | null | undefined): boolean {
  if (!building) return false;
  return (AVAILABLE_BUILDINGS as readonly string[]).includes(building.toUpperCase());
}

// Convert rack code "R1" / "RK12" to SVG element ID "r1" / "rk12"
function rackCodeToSvgId(rackCode: string): string | null {
  const cleaned = String(rackCode).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!/^(r|rk|rb|ra|ry)\d+$/.test(cleaned)) return null;
  return cleaned;
}

type Props = {
  /** Active location code (e.g. "G2.R1") — if provided, rack will be highlighted */
  lokasi?: string | null;
  /** Initial building to show */
  initialBuilding?: string;
  /** Called when user clicks a rack in the SVG */
  onRackClick?: (lokasiCode: string) => void;
};

export default function DenahView({ lokasi, initialBuilding, onRackClick }: Props) {
  const parsed = useMemo(() => parseLokasi(lokasi), [lokasi]);

  // Determine which building to show:
  // - If parsed location matches an available building, use it
  // - Otherwise use initialBuilding or first available
  const defaultBuilding = useMemo(() => {
    if (parsed && hasDenah(parsed.building)) return parsed.building;
    if (initialBuilding && hasDenah(initialBuilding)) return initialBuilding.toUpperCase();
    return AVAILABLE_BUILDINGS[0];
  }, [parsed, initialBuilding]);

  const [activeBuilding, setActiveBuilding] = useState<string>(defaultBuilding);

  // Sync activeBuilding when lokasi changes (e.g. user clicks different list row)
  useEffect(() => {
    if (parsed && hasDenah(parsed.building) && parsed.building !== activeBuilding) {
      setActiveBuilding(parsed.building);
    }
  }, [parsed, activeBuilding]);

  const [svgText, setSvgText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Highlight set: rack IDs to highlight (usually just the parsed one)
  const highlightIds = useMemo(() => {
    if (!parsed || parsed.building !== activeBuilding) return [];
    const svgId = rackCodeToSvgId(parsed.rackCode);
    return svgId ? [svgId] : [];
  }, [parsed, activeBuilding]);

  // Fetch SVG when activeBuilding changes
  const loadSvg = useCallback(async (building: string) => {
    if (!hasDenah(building)) {
      setSvgText("");
      setError(`Denah untuk gedung ${building} tidak tersedia.`);
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

  // Apply highlights + scroll-to-rack after SVG renders
  useEffect(() => {
    if (!svgText || !wrapRef.current) return;
    const wrap = wrapRef.current;
    const svg = wrap.querySelector("svg");
    if (!svg) return;

    // Make sure SVG scales nicely
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");
    svg.style.maxWidth = "100%";
    svg.style.display = "block";
    svg.style.margin = "0 auto";

    // Inject highlight CSS if not already present
    const styleId = "denah-highlight-style";
    if (!wrap.querySelector(`#${styleId}`)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        .denah-rack {
          cursor: pointer;
          transition: fill 0.2s ease, stroke 0.2s ease;
        }
        .denah-rack:hover {
          fill: #fde68a !important;
          stroke: #d97706 !important;
          stroke-width: 2 !important;
        }
        .denah-highlight {
          fill: #dc2626 !important;
          stroke: #7f1d1d !important;
          stroke-width: 3 !important;
          filter: drop-shadow(0 0 8px rgba(220, 38, 38, 0.6));
        }
      `;
      wrap.appendChild(styleEl);
    }

    // Mark all elements with rack-pattern IDs as clickable
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

    // Smooth-scroll the highlighted rack into view inside the scroll area
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

  // Click delegation on SVG (attached to document with capture to bypass
  // any re-render churn on wrapRef.current)
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      // Walk up to find an element with an id matching the rack pattern
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

  return (
    <div className="flex flex-col h-full">
      {/* Building selector + info bar */}
      <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/30 flex-wrap">
        <div className="flex items-center gap-2">
          <FileImage className="size-4 text-emerald-600" />
          <span className="text-sm font-medium">Denah Rak</span>
        </div>
        <div className="flex items-center gap-2">
          {parsed && (
            <Badge variant="outline" className="font-mono text-xs">
              {parsed.building}.{parsed.rackCode}
            </Badge>
          )}
          <Select value={activeBuilding} onValueChange={(v) => setActiveBuilding(v)}>
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_BUILDINGS.map((b) => (
                <SelectItem key={b} value={b}>
                  Gedung {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SVG canvas */}
      <div className="flex-1 min-h-0 bg-slate-50 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-sm">Memuat denah {activeBuilding}…</span>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="flex flex-col items-center gap-2 text-amber-700">
              <AlertCircle className="size-8" />
              <p className="text-sm">{error}</p>
              <p className="text-xs text-muted-foreground">
                Denah tersedia untuk gedung: {AVAILABLE_BUILDINGS.join(", ")}
              </p>
            </div>
          </div>
        )}
        {!loading && !error && svgText && (
          <ScrollArea className="h-full max-h-[calc(100vh-15rem)]">
            <div
              ref={wrapRef}
              className="p-4"
              dangerouslySetInnerHTML={{ __html: svgText }}
            />
          </ScrollArea>
        )}
      </div>

      {/* Footer legend */}
      <div className="p-2 border-t bg-background flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-[#a8d5e5] border border-slate-400" />
          Rak tersedia
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-[#fde68a] border border-amber-500" />
          Hover
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-[#dc2626] border border-red-900" />
          Terpilih
        </span>
        {parsed && parsed.building !== activeBuilding && (
          <span className="text-amber-700 ml-auto flex items-center gap-1">
            <MapPin className="size-3" />
            Lokasi terpilih ada di gedung {parsed.building} — pilih gedung tersebut
          </span>
        )}
      </div>
    </div>
  );
}
