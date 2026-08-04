"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  SlidersHorizontal,
  X,
  FileImage,
  Upload,
  Database,
} from "lucide-react";
import { api, type Location } from "@/lib/api";
import DenahView, {
  parseLokasi,
  hasDenah,
  AVAILABLE_BUILDINGS,
  ALL_BUILDINGS,
  refreshAvailableBuildings,
} from "./DenahView";
import UploadDenahDialog from "./UploadDenahDialog";

type Props = {
  onChanged?: () => void;
};

export default function ExplorePanel({ onChanged }: Props) {
  const [list, setList] = useState<Location[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Location | null>(null);

  // Rack-click popup (archives at same location code)
  const [rackPopupCode, setRackPopupCode] = useState<string | null>(null);
  const [rackPopupData, setRackPopupData] = useState<Location[] | null>(null);
  const [rackPopupLoading, setRackPopupLoading] = useState(false);

  // Upload-denah dialog
  const [uploadOpen, setUploadOpen] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState("");
  const [prov, setProv] = useState("");
  const [periode, setPeriode] = useState("");
  const [building, setBuilding] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filterParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      jenis: jenis.trim() || undefined,
      prov: prov.trim() || undefined,
      periode: periode.trim() || undefined,
      building: building.trim().toUpperCase() || undefined,
    }),
    [q, jenis, prov, periode, building]
  );

  const selectedParsed = useMemo(
    () => parseLokasi(selectedDetail?.lokasi),
    [selectedDetail]
  );

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
      loadList();
    }, 350);
    return () => clearTimeout(t);
  }, [loadList]);

  // Load full detail when a row is selected
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

  const handleRackClick = useCallback((code: string) => {
    setRackPopupCode(code);
  }, []);

  const handleListClick = useCallback((row: Location) => {
    setSelectedId(row.id);
  }, []);

  // Available buildings for the badge counter
  const [liveBuildings, setLiveBuildings] = useState<string[]>([...AVAILABLE_BUILDINGS]);
  useEffect(() => {
    refreshAvailableBuildings().then(setLiveBuildings);
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
      {/* ─── Sidebar: search + list ─── */}
      <div className="space-y-3 lg:max-h-[calc(100vh-9rem)] lg:overflow-hidden lg:flex lg:flex-col">
        <Card className="shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="size-4 text-emerald-600" /> Pencarian Arsip
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
              {(q || jenis || prov || periode || building) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQ("");
                    setJenis("");
                    setProv("");
                    setPeriode("");
                    setBuilding("");
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
                  <Label className="text-xs">Gedung</Label>
                  <Input
                    value={building}
                    onChange={(e) => setBuilding(e.target.value.toUpperCase())}
                    placeholder="G2, F4…"
                    className="h-8 text-sm uppercase"
                  />
                </div>
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
                <div className="space-y-1">
                  <Label className="text-xs">Provenance</Label>
                  <Input
                    value={prov}
                    onChange={(e) => setProv(e.target.value)}
                    placeholder="BPS"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 flex-wrap">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                <FileImage className="size-3 mr-1" /> {liveBuildings.length}/{ALL_BUILDINGS.length} gedung berdenah
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[11px] gap-1 px-2"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="size-3" /> Upload denah
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Hasil Pencarian</span>
              {!loadingList && list.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {list.length} baris
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-[calc(100vh-22rem)] lg:h-full max-h-[600px]">
              <div className="px-3 pb-3 pt-1 space-y-2">
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
                    const hasSvg = parsed && liveBuildings.includes(parsed.building);
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleListClick(r)}
                        className={`w-full text-left rounded-lg border p-3 transition-all ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/60 shadow-sm"
                            : "border-border hover:border-emerald-300 hover:bg-muted/40 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-mono font-semibold text-sm break-all">
                            {r.lokasi || "(tanpa kode)"}
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end shrink-0">
                            {hasSvg ? (
                              <Badge variant="outline" className="text-emerald-700 border-emerald-300 text-[10px]">
                                <FileImage className="size-2.5 mr-0.5" /> denah
                              </Badge>
                            ) : parsed ? (
                              <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">
                                no svg
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                no code
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {r.jalanMasuk || "—"}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
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

      {/* ─── Main view: Denah Rak only ─── */}
      <div className="space-y-3">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <FileImage className="size-4 text-emerald-600" />
              <span className="text-sm font-medium">Denah Rak</span>
              {selectedParsed && (
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedParsed.building}.{selectedParsed.rackCode}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedParsed
                ? "Klik rak di denah untuk lihat arsip"
                : "Pilih lokasi untuk highlight rak"}
            </div>
          </div>

          <CardContent className="p-0 h-[60vh] lg:h-[calc(100vh-15rem)] min-h-[400px] relative">
            <DenahView
              lokasi={selectedDetail?.lokasi}
              highlightRackCode={rackPopupCode}
              onRackClick={handleRackClick}
            />
          </CardContent>
        </Card>

        {/* Detail panel */}
        {selectedDetail && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    <Database className="size-4 text-emerald-600 shrink-0" />
                    <span className="font-mono">{selectedDetail.lokasi || "(tanpa kode lokasi)"}</span>
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
                  className="shrink-0"
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
              </div>
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
            <DialogDescription>
              Klik arsip untuk melihat detail lengkap.
            </DialogDescription>
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
                    Ditemukan <b>{rackPopupData.length}</b> arsip di rak ini.
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
                        <span className="text-sm font-medium line-clamp-1">
                          {r.jalanMasuk || "—"}
                        </span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {r.jenis || "—"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {r.provenance || "—"}
                        {r.periode ? ` · ${r.periode}` : ""}
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

      {/* Upload-denah dialog */}
      <UploadDenahDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={() => {
          setUploadOpen(false);
          refreshAvailableBuildings().then(setLiveBuildings);
          loadList();
          onChanged?.();
        }}
      />
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
