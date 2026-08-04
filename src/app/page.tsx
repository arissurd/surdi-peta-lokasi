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

  if (bootLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F6F4]">
        <div className="flex flex-col items-center gap-3 text-[#5F677C]">
          <div className="size-12 border-2 border-[#BA5D5D] flex items-center justify-center">
            <MapPin className="size-6 text-[#BA5D5D] animate-pulse" />
          </div>
          <p className="text-sm tracking-wider">MEMUAT SURDI</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoggedIn={refreshUser} />;
  }

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F4]">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 border-b border-[#E8E8E8] bg-white/95 backdrop-blur">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 border-2 border-[#BA5D5D] flex items-center justify-center shrink-0">
              <MapPin className="size-5 text-[#BA5D5D]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight truncate text-[#232837]">
                <span className="sm:hidden">SURDI</span>
                <span className="hidden sm:inline">SURDI — Peta Lokasi Arsip</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-[#8B92A5] hidden sm:block tracking-wider uppercase">
                Sistem Penelusuran Digital Arsip
              </p>
            </div>
          </div>

          {isAdmin && (
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="hidden sm:block">
              <TabsList className="bg-transparent border-0 h-9">
                <TabsTrigger
                  value="explore"
                  className="gap-1.5 data-[state=active]:bg-[#BA5D5D] data-[state=active]:text-white text-[#5F677C]"
                >
                  <MapIcon className="size-3.5" /> Eksplorasi
                </TabsTrigger>
                <TabsTrigger
                  value="admin"
                  className="gap-1.5 data-[state=active]:bg-[#232837] data-[state=active]:text-white text-[#5F677C]"
                >
                  <ShieldCheck className="size-3.5" /> Admin
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="sm:hidden text-[#5F677C]"
                onClick={() => setTab((t) => (t === "explore" ? "admin" : "explore"))}
              >
                {tab === "explore" ? "Admin" : "Eksplorasi"}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-[#E8E8E8] text-[#5F677C] hover:bg-[#F7F6F4]">
                  <div className="size-6 border border-[#E8E8E8] flex items-center justify-center">
                    <UserIcon className="size-3.5" />
                  </div>
                  <span className="hidden sm:inline truncate max-w-[120px]">
                    {user.name || user.email}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      isAdmin
                        ? "border-[#BA5D5D] text-[#BA5D5D] text-[10px] px-1.5"
                        : "border-[#E8E8E8] text-[#8B92A5] text-[10px] px-1.5"
                    }
                  >
                    {user.role}
                  </Badge>
                  <ChevronDown className="size-3.5 text-[#8B92A5]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 border-[#E8E8E8]">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="font-medium text-[#232837]">{user.name || "Tanpa nama"}</span>
                  <span className="text-xs font-normal text-[#8B92A5]">{user.email}</span>
                  <Badge
                    variant="outline"
                    className={`w-fit mt-1 ${isAdmin ? "border-[#BA5D5D] text-[#BA5D5D]" : "border-[#E8E8E8] text-[#8B92A5]"}`}
                  >
                    {isAdmin ? "Administrator" : "Pengguna"}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-[#BA5D5D] focus:text-[#BA5D5D] focus:bg-[#BA5D5D]/5"
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
      <footer className="border-t border-[#E8E8E8] bg-white mt-auto">
        <div className="container mx-auto max-w-7xl px-4 py-4 flex items-center justify-between flex-wrap gap-2 text-xs text-[#8B92A5]">
          <span>
            © {new Date().getFullYear()} SURDI — Peta Lokasi Arsip
          </span>
          <span className="font-mono text-[10px] tracking-wider">DB: tb_lokasi · {user.role}</span>
        </div>
      </footer>
    </div>
  );
}
