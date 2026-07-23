"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { api, type Location } from "@/lib/api";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Location | null;
  onSaved: () => void;
};

const FIELDS: { key: keyof Location; label: string; full?: boolean; numeric?: boolean }[] = [
  { key: "provenance", label: "Provenance" },
  { key: "jalanMasuk", label: "Jalan Masuk", full: true },
  { key: "periode", label: "Periode" },
  { key: "lokasi", label: "Kode Lokasi" },
  { key: "jenis", label: "Jenis" },
  { key: "media", label: "Media" },
  { key: "nomorJumlah", label: "Nomor / Jumlah" },
  { key: "bagian", label: "Bagian" },
  { key: "pAkuisisi", label: "P. Akuisisi" },
  { key: "pPengolahan", label: "P. Pengolahan" },
  { key: "pDigitalisasi", label: "P. Digitalisasi" },
  { key: "pRestorasi", label: "P. Restorasi" },
  { key: "noInventaris", label: "No. Inventaris" },
  { key: "latitude", label: "Latitude", numeric: true },
  { key: "longitude", label: "Longitude", numeric: true },
];

export default function LocationFormDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const obj: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = editing?.[f.key];
      obj[f.key] = v == null ? "" : String(v);
    }
    obj["address"] = editing?.address || "";
    setForm(obj);
  }, [open, editing]);

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = {};
    for (const f of FIELDS) {
      const v = (form[f.key] || "").trim();
      if (f.numeric) {
        body[f.key] = v === "" ? null : Number(v);
      } else {
        body[f.key] = v === "" ? null : v;
      }
    }
    body.address = (form.address || "").trim() || null;

    setSaving(true);
    try {
      if (editing) {
        await api.updateLocation(editing.id, body);
        toast.success("Lokasi diperbarui");
      } else {
        await api.createLocation(body);
        toast.success("Lokasi dibuat");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Lokasi Arsip" : "Tambah Lokasi Arsip"}</DialogTitle>
          <DialogDescription>
            {editing
              ? `Edit data untuk lokasi ${editing.lokasi || "(tanpa kode)"}`
              : "Isi data arsip baru. Field bertanda * wajib diisi."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className={`space-y-1.5 ${f.full ? "sm:col-span-2" : ""}`}>
                <Label htmlFor={`f-${f.key}`} className="text-xs">
                  {f.label}
                </Label>
                <Input
                  id={`f-${f.key}`}
                  value={form[f.key] || ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  inputMode={f.numeric ? "decimal" : undefined}
                  type={f.numeric ? "text" : "text"}
                  placeholder={f.numeric ? "contoh: -6.2088" : ""}
                />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-address" className="text-xs">
              Alamat (untuk tampilan peta)
            </Label>
            <Textarea
              id="f-address"
              value={form.address || ""}
              onChange={(e) => setField("address", e.target.value)}
              rows={2}
              placeholder="Alamat lengkap, contoh: BPS Provinsi DI Aceh, Banda Aceh"
            />
          </div>
          <DialogFooter className="sticky bottom-0 bg-background/80 backdrop-blur pt-2 -mx-6 px-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "Simpan Perubahan" : "Buat Lokasi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
