"use client";

import { useCallback, useEffect, useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import ExplorePanel from "@/components/ExplorePanel";
import AdminPanel from "@/components/AdminPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Map as MapIcon, MapPin, ShieldCheck, User as UserIcon, ChevronDown } from "lucide-react";
import { api, type AuthUser } from "@/lib/api";
import { toast } from "sonner";

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [tab, setTab] = useState<"explore" | "admin">("explore");

  // Check current session on first load
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.me();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      setTab("explore");
      toast.success("Berhasil logout");
    } catch (e: any) {
      toast.error(e?.message || "Gagal logout");
    }
  };

  // Boot loading screen
  if (bootLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <MapPin className="size-5 text-white animate-pulse" />
          </div>
          <p className="text-sm">Memuat SURDI…</p>
        </div>
      </div>
    );
  }

  // Not logged in → login screen
  if (!user) {
    return <LoginScreen onLoggedIn={refreshUser} />;
  }

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100/40">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
              <MapPin className="size-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
                SURDI — Peta Lokasi Arsip
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Sistem Penelusuran Digital Arsip
              </p>
            </div>
          </div>

          {/* Tabs (only show admin tab if ADMIN) */}
          {isAdmin && (
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="hidden sm:block">
              <TabsList>
                <TabsTrigger value="explore" className="gap-1.5">
                  <MapIcon className="size-3.5" /> Eksplorasi
                </TabsTrigger>
                <TabsTrigger value="admin" className="gap-1.5">
                  <ShieldCheck className="size-3.5" /> Admin
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* User dropdown */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="sm:hidden"
                onClick={() => setTab((t) => (t === "explore" ? "admin" : "explore"))}
              >
                {tab === "explore" ? "Admin" : "Eksplorasi"}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <div className="size-6 rounded-full bg-muted flex items-center justify-center">
                    <UserIcon className="size-3.5" />
                  </div>
                  <span className="hidden sm:inline truncate max-w-[120px]">
                    {user.name || user.email}
                  </span>
                  <Badge
                    variant={isAdmin ? "default" : "secondary"}
                    className={
                      isAdmin
                        ? "bg-rose-600 hover:bg-rose-600 text-white text-[10px] px-1.5"
                        : "text-[10px] px-1.5"
                    }
                  >
                    {user.role}
                  </Badge>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="font-medium">{user.name || "Tanpa nama"}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                  <Badge
                    variant={isAdmin ? "default" : "secondary"}
                    className={`w-fit mt-1 ${isAdmin ? "bg-rose-600 hover:bg-rose-600 text-white" : ""}`}
                  >
                    {isAdmin ? "Administrator" : "Pengguna"}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-4">
        {!isAdmin || tab === "explore" ? (
          <ExplorePanel />
        ) : (
          <AdminPanel onRefreshStats={undefined} />
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t bg-background/95 mt-auto">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} SURDI — Peta Lokasi Arsip. Dibangun dengan Next.js, Prisma, dan Leaflet.
          </span>
          <span className="font-mono">DB: tb_lokasi · {user.role}</span>
        </div>
      </footer>
    </div>
  );
}
