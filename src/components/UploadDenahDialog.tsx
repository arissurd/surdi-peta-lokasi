"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertCircle, FileImage, Loader2, Upload, X } from "lucide-react";
import {
  DEFAULT_BUILDINGS,
  ALL_BUILDINGS,
  refreshAvailableBuildings,
  getAvailableBuildings,
} from "./DenahView";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUploaded?: () => void;
};

export default function UploadDenahDialog({ open, onOpenChange, onUploaded }: Props) {
  const [building, setBuilding] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [liveBuildings, setLiveBuildings] = useState<string[]>(getAvailableBuildings());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh the available list whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    refreshAvailableBuildings().then(setLiveBuildings);
    // Default to the first missing building
    const missing = (ALL_BUILDINGS as readonly string[]).filter(
      (b) => !liveBuildings.includes(b)
    );
    setBuilding(missing[0] || "E3");
    setFile(null);
  }, [open, liveBuildings]);

  const missingBuildings = useMemo(
    () => (ALL_BUILDINGS as readonly string[]).filter((b) => !liveBuildings.includes(b)),
    [liveBuildings]
  );
  const existingBuildings = useMemo(
    () => (ALL_BUILDINGS as readonly string[]).filter((b) => liveBuildings.includes(b)),
    [liveBuildings]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!building) {
      toast.error("Pilih gedung terlebih dahulu");
      return;
    }
    if (!file) {
      toast.error("Pilih file SVG terlebih dahulu");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".svg")) {
      toast.error("File harus berekstensi .svg");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file melebihi 10 MB");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("building", building);
      fd.append("file", file);
      const res = await fetch("/api/denah/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      toast.success(json.message || `Denah ${building} berhasil diunggah`);
      // Refresh the live building list so the dropdown updates
      await refreshAvailableBuildings();
      onUploaded?.();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengunggah denah");
    } finally {
      setSaving(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5 text-[#BA5D5D]" />
            Upload Denah Gedung
          </DialogTitle>
          <DialogDescription>
            Unggah file SVG floor plan untuk gedung yang belum tersedia. SVG harus
            berisi elemen <code>&lt;rect id="r1" /&gt;</code>,{" "}
            <code>&lt;rect id="r2" /&gt;</code>, dst. agar rak bisa di-highlight.
          </DialogDescription>
        </DialogHeader>

        {/* Status overview */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <FileImage className="size-4 text-[#BA5D5D] mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Sudah tersedia ({liveBuildings.length})</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {existingBuildings.map((b) => (
                  <Badge key={b} variant="outline" className="bg-[#BA5D5D]/10 text-[#BA5D5D] border-[#BA5D5D]/30 text-[10px]">
                    {b}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          {missingBuildings.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium">Belum tersedia ({missingBuildings.length})</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {missingBuildings.map((b) => (
                    <Badge key={b} variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="building">Pilih Gedung</Label>
            <Select value={building} onValueChange={setBuilding}>
              <SelectTrigger id="building">
                <SelectValue placeholder="Pilih gedung…" />
              </SelectTrigger>
              <SelectContent>
                {/* Show missing buildings first, marked */}
                {missingBuildings.map((b) => (
                  <SelectItem key={b} value={b}>
                    Gedung {b} <span className="text-amber-600 text-xs ml-2">(belum ada)</span>
                  </SelectItem>
                ))}
                {existingBuildings.map((b) => (
                  <SelectItem key={b} value={b}>
                    Gedung {b} <span className="text-[#BA5D5D] text-xs ml-2">(ganti)</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pilih "(belum ada)" untuk menambah denah baru, atau "(ganti)" untuk
              menimpa denah yang sudah ada.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File SVG</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".svg,image/svg+xml"
                onChange={onFileChange}
                className="flex-1"
              />
              {file && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  aria-label="Hapus file"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} — {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <b>Catatan:</b> pastikan setiap rak dalam SVG memiliki atribut{" "}
            <code className="font-mono">id="r&lt;nomor&gt;"</code> (mis.{" "}
            <code className="font-mono">id="r1"</code>,{" "}
            <code className="font-mono">id="r201"</code>) agar sinkron dengan kode
            lokasi seperti <code className="font-mono">{building || "G2"}.R1</code>.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saving || !building || !file}
              className="bg-[#BA5D5D] hover:bg-[#A04D4D] text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Mengunggah…
                </>
              ) : (
                <>
                  <Upload className="size-4" /> Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
