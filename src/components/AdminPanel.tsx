"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  MapPin,
  Pencil,
  PlusCircle,
  Search,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  Users,
} from "lucide-react";
import { api, type AdminUser, type Location, type Stats } from "@/lib/api";
import LocationFormDialog from "./LocationFormDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Props = {
  onRefreshStats?: () => void;
};

export default function AdminPanel({ onRefreshStats }: Props) {
  const [tab, setTab] = useState<"stats" | "users" | "locations">("stats");

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="stats" className="gap-2">
            <ShieldCheck className="size-4" /> Statistik
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="size-4" /> Manajemen Pengguna
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <MapPin className="size-4" /> Manajemen Lokasi
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Total Lokasi", value: stats.totalLocations, sub: `${stats.mappedLocations} sudah ada koordinat`, color: "text-emerald-600" },
    { label: "Belum Terpetakan", value: stats.unmappedLocations, sub: `${((stats.unmappedLocations / Math.max(1, stats.totalLocations)) * 100).toFixed(1)}% dari total`, color: "text-amber-600" },
    { label: "Total Pengguna", value: stats.totalUsers, sub: `${stats.adminUsers} admin · ${stats.regularUsers} user`, color: "text-sky-600" },
    { label: "Admin Aktif", value: stats.adminUsers, sub: "akun dengan hak penuh", color: "text-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{c.label}</div>
              <div className={`mt-1 text-3xl font-bold tabular-nums ${c.color}`}>
                {c.value.toLocaleString("id-ID")}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
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
                className="h-full bg-emerald-500"
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
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
                        className={u.role === "ADMIN" ? "bg-rose-600 hover:bg-rose-600 text-white" : ""}
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
                <SelectItem value="USER">USER — pencarian & peta</SelectItem>
                <SelectItem value="ADMIN">ADMIN — kelola pengguna & lokasi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
  const [editing, setEditing] = useState<Location | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.list({
        q: q || undefined,
        jenis: jenis || undefined,
        prov: prov || undefined,
        periode: periode || undefined,
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
  }, [q, jenis, prov, periode, page, limit]);

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
      </div>
    ),
    [q, jenis, prov, periode]
  );

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
          <Button
            onClick={() => setCreating(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <PlusCircle className="size-4" /> Tambah Lokasi
          </Button>
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
                  <TableHead>Koordinat</TableHead>
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
                    <TableCell>
                      {r.latitude != null && r.longitude != null ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          belum ada
                        </Badge>
                      )}
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
    </Card>
  );
}
