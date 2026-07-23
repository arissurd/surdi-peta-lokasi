"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
  FileImage,
  Map as MapIcon,
} from "lucide-react";
import { api, type Location, type MapMarker } from "@/lib/api";
import DenahView, { parseLokasi, hasDenah, AVAILABLE_BUILDINGS } from "./DenahView";

// Leaflet needs `window`, so load MapView only on the client
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
      Memuat peta…
    </div>
  ),
});

type Props = {
  onChanged?: () => void;
};

type ViewMode = "map" | "denah";

export default function ExplorePanel({ onChanged }: Props) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loadingMap, setLoadingMap] = useState(true);
  const [list, setList] = useState<Location[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Location | null>(null);
  const [view, setView] = useState<ViewMode>("map");

  // Rack-click popup (archives at same location code)
  const [rackPopupCode, setRackPopupCode] = useState<string | null>(null);
  const [rackPopupData, setRackPopupData] = useState<Location[] | null>(null);
  const [rackPopupLoading, setRackPopupLoading] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState("");
  const [prov, setProv] = useState("");
  const [periode, setPeriode] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filterParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      jenis: jenis.trim() || undefined,
      prov: prov.trim() || undefined,
      periode: periode.trim() || undefined,
    }),
    [q, jenis, prov, periode]
  );

  // Track the parsed lokasi of the currently-selected item
  const selectedParsed = useMemo(
    () => parseLokasi(selectedDetail?.lokasi),
    [selectedDetail]
  );

  // Decide whether denah is available for the current selection
  const denahAvailable = useMemo(
    () => !!selectedParsed && hasDenah(selectedParsed.building),
    [selectedParsed]
  );

  // Load map markers
  const loadMarkers = useCallback(async () => {
    setLoadingMap(true);
    try {
      const res = await api.mapMarkers(filterParams);
      setMarkers(res.markers);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat marker peta");
    } finally {
      setLoadingMap(false);
    }
  }, [filterParams]);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await api.list({ ...filterParams, page: 1, limit: 50 });
      setList(res.data);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat daftar");
    } finally {
      setLoadingList(false);
    }
  }, [filterParams]);

  // Debounced reload on filter change
  useEffect(() => {
    const t = setTimeout(() => {
      loadMarkers();
      loadList();
    }, 350);
    return () => clearTimeout(t);
  }, [loadMarkers, loadList]);

  // Load full detail when a marker/list row is selected
  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getLocation(selectedId);
        if (!cancelled) setSelectedDetail(res.data);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || "Gagal memuat detail");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // Auto-switch view: when a new location is selected, prefer denah if available
  useEffect(() => {
    if (!selectedDetail) return;
    const p = parseLokasi(selectedDetail.lokasi);
    if (p && hasDenah(p.building)) {
      setView("denah");
    } else if (selectedDetail.latitude != null && selectedDetail.longitude != null) {
      setView("map");
    }
    // If neither denah nor coords: stay on current view (will show empty state)
  }, [selectedDetail]);

  // Load rack popup data when code changes
  useEffect(() => {
    if (!rackPopupCode) {
      setRackPopupData(null);
      return;
    }
    let cancelled = false;
    setRackPopupLoading(true);
    (async () => {
      try {
        const res = await api.byCode(rackPopupCode);
        if (!cancelled) setRackPopupData(res.data);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || "Gagal memuat arsip di rak ini");
      } finally {
        if (!cancelled) setRackPopupLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rackPopupCode]);

  // When user clicks a rack inside the denah SVG
  const handleRackClick = useCallback((code: string) => {
    setRackPopupCode(code);
  }, []);

  // When user clicks a row in the sidebar list
  const handleListClick = useCallback((row: Location) => {
    setSelectedId(row.id);
    const p = parseLokasi(row.lokasi);
    if (p && hasDenah(p.building)) {
      setView("denah");
    } else if (row.latitude != null && row.longitude != null) {
      setView("map");
    } else if (p) {
      // Building+rack parsed but no SVG → try denah anyway, will show error
      // Better: stay on map and notify
      toast.info(`Lokasi ${p.building}.${p.rackCode} — denah gedung ${p.building} belum tersedia`);
    } else {
      toast.info("Lokasi ini belum memiliki koordinat atau kode rak yang valid");
    }
  }, []);

  const totalMarkers = markers.length;

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
      {/* ─── Sidebar: search + list ─── */}
      <div className="space-y-3 lg:max-h-[calc(100vh-9rem)] lg:overflow-hidden lg:flex lg:flex-col">
        <Card className="shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="size-4" /> Pencarian Arsip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari kode lokasi, jalan masuk, no inventaris…"
                className="pl-8"
              />
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters((v) => !v)}
                className="text-xs"
              >
                <SlidersHorizontal className="size-3.5" />
                {showFilters ? "Sembunyikan filter" : "Filter lanjutan"}
              </Button>
              {(q || jenis || prov || periode) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQ("");
                    setJenis("");
                    setProv("");
                    setPeriode("");
                  }}
                  className="text-xs text-muted-foreground"
                >
                  <X className="size-3.5" /> Reset
                </Button>
              )}
            </div>
            {showFilters && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs">Jenis</Label>
                  <Input
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value)}
                    placeholder="KARTOGRAFI"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Periode</Label>
                  <Input
                    value={periode}
                    onChange={(e) => setPeriode(e.target.value)}
                    placeholder="1980"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Provenance</Label>
                  <Input
                    value={prov}
                    onChange={(e) => setProv(e.target.value)}
                    placeholder="Badan Pusat Statistik"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 flex-wrap">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                <MapPin className="size-3 mr-1" /> {totalMarkers} marker
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                <FileImage className="size-3 mr-1" /> {AVAILABLE_BUILDINGS.length} denah
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-base">Hasil Pencarian</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-[calc(100vh-22rem)] lg:h-full max-h-[600px]">
              <div className="px-4 pb-4 space-y-2">
                {loadingList ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))
                ) : list.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Tidak ada arsip yang cocok.
                  </p>
                ) : (
                  list.map((r) => {
                    const isSelected = r.id === selectedId;
                    const parsed = parseLokasi(r.lokasi);
                    const hasCoord = r.latitude != null && r.longitude != null;
                    const hasSvg = parsed && hasDenah(parsed.building);
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleListClick(r)}
                        className={`w-full text-left rounded-lg border p-3 transition-colors ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/50"
                            : "border-border hover:border-emerald-300 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-mono font-semibold text-sm">
                            {r.lokasi || "(tanpa kode)"}
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {hasSvg && (
                              <Badge variant="outline" className="text-emerald-700 border-emerald-300 text-[10px]">
                                <FileImage className="size-2.5 mr-0.5" /> denah
                              </Badge>
                            )}
                            {hasCoord ? (
                              <Badge variant="outline" className="text-emerald-700 border-emerald-300 text-[10px]">
                                <MapPin className="size-2.5 mr-0.5" /> peta
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">
                                no coord
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {r.jalanMasuk || "—"}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                          {r.jenis && <Badge variant="secondary" className="text-[10px]">{r.jenis}</Badge>}
                          {r.periode && <span className="text-muted-foreground">{r.periode}</span>}
                          {r.media && <span className="text-muted-foreground">· {r.media}</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ─── Main view: Peta / Denah toggle + detail ─── */}
      <div className="space-y-3">
        <Card className="overflow-hidden">
          {/* View toggle header */}
          <div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/30">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={view === "map" ? "default" : "ghost"}
                onClick={() => setView("map")}
                className={
                  view === "map"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : ""
                }
              >
                <MapIcon className="size-4" /> Peta
              </Button>
              <Button
                size="sm"
                variant={view === "denah" ? "default" : "ghost"}
                onClick={() => setView("denah")}
                disabled={!denahAvailable && !selectedParsed}
                className={
                  view === "denah"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : ""
                }
                title={
                  !denahAvailable && selectedParsed
                    ? `Denah gedung ${selectedParsed.building} belum tersedia`
                    : "Tampilkan denah rak"
                }
              >
                <FileImage className="size-4" /> Denah Rak
              </Button>
            </div>
            <div className="text-xs text-muted-foreground pr-2">
              {view === "map"
                ? `${totalMarkers} marker ditampilkan`
                : selectedParsed
                ? `Lokasi: ${selectedParsed.building}.${selectedParsed.rackCode}`
                : "Pilih lokasi untuk highlight rak"}
            </div>
          </div>

          <CardContent className="p-0 h-[55vh] lg:h-[calc(100vh-15rem)] min-h-[400px] relative">
            {view === "map" ? (
              <>
                {loadingMap && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-6 animate-spin" />
                      <span className="text-sm">Memuat marker…</span>
                    </div>
                  </div>
                )}
                <MapView
                  markers={markers}
                  selectedId={selectedId}
                  onSelect={(m) => setSelectedId(m.id)}
                />
              </>
            ) : (
              <DenahView
                lokasi={selectedDetail?.lokasi}
                onRackClick={handleRackClick}
              />
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        {selectedDetail && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="size-4 text-emerald-600" />
                    {selectedDetail.lokasi || "(tanpa kode lokasi)"}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                    {selectedDetail.jalanMasuk || "—"}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedId(null)}
                  aria-label="Tutup detail"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <DetailItem label="Provenance" value={selectedDetail.provenance} />
                <DetailItem label="Jenis" value={selectedDetail.jenis} />
                <DetailItem label="Media" value={selectedDetail.media} />
                <DetailItem label="Periode" value={selectedDetail.periode} />
                <DetailItem label="Bagian" value={selectedDetail.bagian} />
                <DetailItem label="Nomor / Jumlah" value={selectedDetail.nomorJumlah} />
                <DetailItem label="No. Inventaris" value={selectedDetail.noInventaris} />
                <DetailItem label="P. Akuisisi" value={selectedDetail.pAkuisisi} />
                <DetailItem label="P. Pengolahan" value={selectedDetail.pPengolahan} />
                <DetailItem label="P. Digitalisasi" value={selectedDetail.pDigitalisasi} />
                <DetailItem label="P. Restorasi" value={selectedDetail.pRestorasi} />
                {selectedDetail.latitude != null && selectedDetail.longitude != null && (
                  <DetailItem
                    label="Koordinat"
                    value={`${selectedDetail.latitude.toFixed(4)}, ${selectedDetail.longitude.toFixed(4)}`}
                  />
                )}
              </div>
              {selectedDetail.address && (
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <b>Alamat:</b> {selectedDetail.address}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rack-click popup: list archives at this rack */}
      <Dialog open={!!rackPopupCode} onOpenChange={(v) => !v && setRackPopupCode(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="size-5 text-emerald-600" />
              Arsip di Rak <span className="font-mono">{rackPopupCode}</span>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-2">
              {rackPopupLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))
              ) : rackPopupData && rackPopupData.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Ditemukan <b>{rackPopupData.length}</b> arsip di rak ini. Klik untuk lihat detail.
                  </p>
                  {rackPopupData.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedId(r.id);
                        setRackPopupCode(null);
                      }}
                      className="w-full text-left rounded-lg border p-3 hover:border-emerald-300 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-sm">
                          {r.lokasi || "(tanpa kode)"}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {r.jenis || "—"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {r.jalanMasuk || "—"}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {r.provenance || "—"} · {r.periode || "—"}
                        {r.nomorJumlah ? ` · ${r.nomorJumlah}` : ""}
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                !rackPopupLoading && (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Tidak ada arsip di rak ini.
                  </p>
                )
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium break-words">{value || "—"}</div>
    </div>
  );
}
