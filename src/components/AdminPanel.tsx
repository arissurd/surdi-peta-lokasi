"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertTriangle,
  Loader2,
  FileImage,
  Pencil,
  PlusCircle,
  Search,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  Users,
  Database,
  Upload,
  Download,
  X,
} from "lucide-react";
import { api, type AdminUser, type Location, type Stats } from "@/lib/api";
import LocationFormDialog from "./LocationFormDialog";
import UploadDenahDialog from "./UploadDenahDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  onRefreshStats?: () => void;
};

export default function AdminPanel({ onRefreshStats }: Props) {
  const [tab, setTab] = useState<"stats" | "users" | "locations" | "denah">("stats");

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="stats" className="gap-2">
            <ShieldCheck className="size-4" /> Statistik
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="size-4" /> Pengguna
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <Database className="size-4" /> Lokasi
          </TabsTrigger>
          <TabsTrigger value="denah" className="gap-2">
            <FileImage className="size-4" /> Denah
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-4">
          <StatsPanel />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersPanel onChanged={onRefreshStats} />
        </TabsContent>
        <TabsContent value="locations" className="mt-4">
          <LocationsPanel onChanged={onRefreshStats} />
        </TabsContent>
        <TabsContent value="denah" className="mt-4">
          <DenahPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Stats ─────────────────────────────────────────────────────────────────
function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.stats();
      setStats(s);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat statistik");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Total Arsip", value: stats.totalLocations, sub: "seluruh lokasi terdaftar", color: "text-[#BA5D5D]", icon: Database },
    { label: "Total Pengguna", value: stats.totalUsers, sub: `${stats.adminUsers} admin · ${stats.regularUsers} user`, color: "text-sky-600", icon: Users },
    { label: "Admin Aktif", value: stats.adminUsers, sub: "akun dengan hak penuh", color: "text-rose-600", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{c.label}</div>
                    <div className={`mt-1 text-3xl font-bold tabular-nums ${c.color}`}>
                      {c.value.toLocaleString("id-ID")}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{c.sub}</div>
                  </div>
                  <div className={`rounded-lg p-2 bg-muted ${c.color}`}>
                    <Icon className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <BreakdownCard title="Top Jenis Arsip" items={stats.byJenis} />
        <BreakdownCard title="Top Provenance" items={stats.byProv} />
        <BreakdownCard title="Top Periode" items={stats.byPeriode} />
      </div>
    </div>
  );
}

function BreakdownCard({ title, items }: { title: string; items: { name: string; count: number }[] }) {
  const max = items.reduce((m, x) => Math.max(m, x.count), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>12 nilai terbanyak</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Tidak ada data.</p>
        )}
        {items.map((it, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="truncate" title={it.name}>{it.name}</span>
              <span className="font-mono text-muted-foreground tabular-nums">
                {it.count.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-[#BA5D5D]"
                style={{ width: `${(it.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Users ─────────────────────────────────────────────────────────────────
function UsersPanel({ onChanged }: { onChanged?: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listUsers();
      setUsers(res.data);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat pengguna");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await api.deleteUser(deletingId);
      toast.success("Pengguna dihapus");
      setDeletingId(null);
      load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus");
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Daftar Pengguna</CardTitle>
          <CardDescription>Kelola akun admin & user biasa</CardDescription>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="bg-[#BA5D5D] hover:bg-[#A04D4D] text-white"
        >
          <PlusCircle className="size-4" /> Tambah
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-muted flex items-center justify-center">
                          <UserIcon className="size-3.5" />
                        </div>
                        {u.name || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === "ADMIN" ? "default" : "secondary"}
                        className={u.role === "ADMIN" ? "bg-[#232837] hover:bg-[#2F3548] text-white" : ""}
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(u);
                            setShowForm(true);
                          }}
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingId(u.id)}
                          aria-label="Hapus"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      Belum ada pengguna.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <UserFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editing={editing}
        onSaved={() => {
          setShowForm(false);
          load();
          onChanged?.();
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" /> Hapus pengguna?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Akun dan kredensial akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function UserFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AdminUser | null;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(editing?.email || "");
      setName(editing?.name || "");
      setPassword("");
      setRole(editing?.role || "USER");
    }
  }, [open, editing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Email wajib diisi");
    if (!editing && !password) return toast.error("Password wajib diisi");
    if (password && password.length < 6) return toast.error("Password minimal 6 karakter");

    setSaving(true);
    try {
      if (editing) {
        const body: any = { email: email.trim(), name: name.trim(), role };
        if (password) body.password = password;
        await api.updateUser(editing.id, body);
        toast.success("Pengguna diperbarui");
      } else {
        await api.createUser({ email: email.trim(), password, name: name.trim() || undefined, role });
        toast.success("Pengguna dibuat");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Perbarui data pengguna. Kosongkan password jika tidak ingin mengubah."
              : "Buat akun baru dengan role admin atau user."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="u-email">Email</Label>
            <Input
              id="u-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@surdi.go.id"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-name">Nama (opsional)</Label>
            <Input
              id="u-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap pengguna"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-pass">
              Password {editing && <span className="text-muted-foreground">(kosongkan jika tidak diubah)</span>}
            </Label>
            <Input
              id="u-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">USER — pencarian & denah</SelectItem>
                <SelectItem value="ADMIN">ADMIN — kelola pengguna & lokasi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#BA5D5D] hover:bg-[#A04D4D] text-white">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Locations ─────────────────────────────────────────────────────────────
function LocationsPanel({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = useState<Location[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState("");
  const [prov, setProv] = useState("");
  const [periode, setPeriode] = useState("");
  const [building, setBuilding] = useState("");
  const [editing, setEditing] = useState<Location | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.list({
        q: q || undefined,
        jenis: jenis || undefined,
        prov: prov || undefined,
        periode: periode || undefined,
        building: building || undefined,
        page,
        limit,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e: any) {
      toast.error(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [q, jenis, prov, periode, building, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await api.deleteLocation(deletingId);
      toast.success("Lokasi dihapus");
      setDeletingId(null);
      load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus");
    }
  };

  const filterUI = useMemo(
    () => (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Cari lokasi / jalan masuk / no inventaris…"
            className="pl-8"
          />
        </div>
        <Input
          value={jenis}
          onChange={(e) => {
            setJenis(e.target.value);
            setPage(1);
          }}
          placeholder="Jenis (KARTOGRAFI…)"
        />
        <Input
          value={prov}
          onChange={(e) => {
            setProv(e.target.value);
            setPage(1);
          }}
          placeholder="Provenance"
        />
        <Input
          value={periode}
          onChange={(e) => {
            setPeriode(e.target.value);
            setPage(1);
          }}
          placeholder="Periode (1980…)"
        />
        <Input
          value={building}
          onChange={(e) => {
            setBuilding(e.target.value.toUpperCase());
            setPage(1);
          }}
          placeholder="Gedung (G2, F4…)"
        />
      </div>
    ),
    [q, jenis, prov, periode, building]
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (jenis) params.set("jenis", jenis);
      if (prov) params.set("prov", prov);
      if (periode) params.set("periode", periode);
      if (building) params.set("building", building);
      const url = `/api/locations/export?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const today = new Date().toISOString().slice(0, 10);
      const fname = `surdi_lokasi_${today}.xlsx`;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
      toast.success(`Export berhasil: ${fname}`);
    } catch (e: any) {
      toast.error(e?.message || "Gagal export");
    } finally {
      setExporting(false);
    }
  }, [q, jenis, prov, periode, building]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Daftar Lokasi Arsip</CardTitle>
            <CardDescription>
              Total {total.toLocaleString("id-ID")} baris · halaman {page} dari {totalPages}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || total === 0}
              title="Export semua data (sesuai filter) ke Excel"
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              title="Import data dari file Excel"
            >
              <Upload className="size-4" /> Import
            </Button>
            <Button
              onClick={() => setCreating(true)}
              className="bg-[#BA5D5D] hover:bg-[#A04D4D] text-white"
            >
              <PlusCircle className="size-4" /> Tambah
            </Button>
          </div>
        </div>
        <div className="mt-3">{filterUI}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Jalan Masuk</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Provenance</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-semibold">
                      {r.lokasi || "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={r.jalanMasuk || ""}>
                      {r.jalanMasuk || "—"}
                    </TableCell>
                    <TableCell>
                      {r.jenis ? <Badge variant="outline">{r.jenis}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.periode || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground" title={r.provenance || ""}>
                      {r.provenance || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditing(r)}
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingId(r.id)}
                          aria-label="Hapus"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      Tidak ada data sesuai filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman <b>{page}</b> / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya →
          </Button>
        </div>
      </CardContent>

      <LocationFormDialog
        open={creating || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
        editing={editing}
        onSaved={() => {
          setCreating(false);
          setEditing(null);
          load();
          onChanged?.();
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" /> Hapus lokasi?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data arsip akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportArsipDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          setImportOpen(false);
          setPage(1);
          load();
          onChanged?.();
        }}
      />
    </Card>
  );
}

// ─── Import Arsip (XLSX) ───────────────────────────────────────────────────
function ImportArsipDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setMode("append");
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file .xlsx terlebih dahulu");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("File harus berekstensi .xlsx");
      return;
    }
    if (mode === "replace") {
      const ok = window.confirm(
        "Mode REPLACE akan menghapus SEMUA data lokasi yang ada terlebih dahulu, lalu mengimpor data baru. Lanjutkan?"
      );
      if (!ok) return;
    }

    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", mode);
      const res = await fetch("/api/locations/import", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      const msg =
        `Import berhasil: ${json.imported.toLocaleString("id-ID")} baris ditambahkan` +
        (json.skipped ? `, ${json.skipped} dilewati` : "") +
        (json.totalErrors ? `, ${json.totalErrors} error` : "");
      toast.success(msg);
      onImported();
    } catch (e: any) {
      toast.error(e?.message || "Gagal import");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5 text-[#BA5D5D]" />
            Import Arsip dari Excel
          </DialogTitle>
          <DialogDescription>
            Unggah file .xlsx dengan header kolom sesuai struktur tb_lokasi
            (provenance, jalan_masuk, periode, lokasi, jenis, media,
            nomor_jumlah, bagian, p_akuisisi, p_pengolahan, p_digitalisasi,
            p_restorasi, no_inventaris).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-sky-50 border border-sky-200 p-3 text-xs text-sky-900">
          <b>Tip:</b> Gunakan tombol <b>Export</b> untuk mendapatkan template
          .xlsx dengan format yang benar, lalu edit di Excel dan import ulang.
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Mode Import</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("append")}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  mode === "append"
                    ? "border-[#BA5D5D] bg-[#BA5D5D]/5"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="text-sm font-semibold">Append</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Tambahkan data baru tanpa menghapus yang ada
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("replace")}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  mode === "replace"
                    ? "border-rose-500 bg-rose-50/60"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="text-sm font-semibold">Replace</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Hapus SEMUA data lama, lalu impor data baru
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-file">File Excel (.xlsx)</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                id="import-file"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={importing || !file}
              className="bg-[#BA5D5D] hover:bg-[#A04D4D] text-white"
            >
              {importing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Mengimpor…
                </>
              ) : (
                <>
                  <Upload className="size-4" /> Import
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Denah management ──────────────────────────────────────────────────────
function DenahPanel() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [liveBuildings, setLiveBuildings] = useState<string[]>([]);
  const [deletingBuilding, setDeletingBuilding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/denah/list");
      const json = await res.json();
      setLiveBuildings(json.buildings || []);
    } catch (e) {
      toast.error("Gagal memuat daftar denah");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/denah/list");
        const json = await res.json();
        if (!cancelled) setLiveBuildings(json.buildings || []);
      } catch (e) {
        if (!cancelled) toast.error("Gagal memuat daftar denah");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingBuilding) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/denah/${deletingBuilding}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success(json.message || `Denah ${deletingBuilding} dihapus`);
      setDeletingBuilding(null);
      reload();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus denah");
    } finally {
      setDeleting(false);
    }
  }, [deletingBuilding, reload]);

  const ALL = [
    "E3", "E4", "E5", "E6", "E7",
    "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9",
    "G2", "G3", "G4", "G5", "G6", "G7", "G8",
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Manajemen Denah Gedung</CardTitle>
          <CardDescription>
            Kelola file SVG floor plan untuk tiap gedung. {liveBuildings.length}/{ALL.length} gedung sudah berdenah.
          </CardDescription>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-[#BA5D5D] hover:bg-[#A04D4D] text-white"
        >
          <Upload className="size-4" /> Upload Denah
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ALL.map((b) => {
            const has = liveBuildings.includes(b);
            return (
              <div
                key={b}
                className={`rounded-lg border p-3 flex items-center justify-between transition-colors ${
                  has
                    ? "border-[#BA5D5D]/20 bg-[#BA5D5D]/5"
                    : "border-[#CFD16C]/30 bg-[#CFD16C]/5"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileImage
                    className={`size-5 shrink-0 ${has ? "text-[#BA5D5D]" : "text-[#CFD16C]"}`}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold">Gedung {b}</div>
                    <div className={`text-xs ${has ? "text-[#BA5D5D]" : "text-[#8B8730]"}`}>
                      {has ? "denah tersedia" : "belum ada denah"}
                    </div>
                  </div>
                </div>
                {has ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => setDeletingBuilding(b)}
                    aria-label={`Hapus denah ${b}`}
                    title="Hapus denah"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : (
                  <Badge variant="outline" className="bg-[#CFD16C]/15 text-[#8B8730] hover:bg-[#CFD16C]/15 border-[#CFD16C]/40 shrink-0">
                    ✕ kosong
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          <b>Petunjuk format SVG:</b> setiap rak harus memiliki atribut{" "}
          <code className="font-mono">id="r&lt;nomor&gt;"</code> (mis.{" "}
          <code className="font-mono">id="r1"</code>,{" "}
          <code className="font-mono">id="r201"</code>) agar sinkron dengan kode
          lokasi seperti <code className="font-mono">G2.R1</code>. Maksimal ukuran file 10 MB.
        </div>
      </CardContent>

      <UploadDenahDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={() => {
          setUploadOpen(false);
          reload();
        }}
      />

      <AlertDialog
        open={!!deletingBuilding}
        onOpenChange={(o) => !o && setDeletingBuilding(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" /> Hapus denah?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Denah untuk gedung <b>{deletingBuilding}</b> akan dihapus permanen.
              Lokasi arsip di gedung ini akan kembali menampilkan badge
              "no svg" dan tidak bisa menampilkan denah rak. Anda dapat
              mengunggah ulang SVG kapan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Menghapus…
                </>
              ) : (
                "Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
