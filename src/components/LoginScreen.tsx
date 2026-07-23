"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Props = {
  onLoggedIn: () => void;
};

export default function LoginScreen({ onLoggedIn }: Props) {
  const [email, setEmail] = useState("admin@surdi.go.id");
  const [password, setPassword] = useState("admin123");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Email dan password wajib diisi");
      return;
    }
    setLoading(true);
    try {
      await api.login(email.trim(), password);
      toast.success("Login berhasil");
      onLoggedIn();
    } catch (err: any) {
      toast.error(err?.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <MapPin className="size-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            SURDI — Peta Lokasi Arsip
          </CardTitle>
          <CardDescription>
            Sistem Penelusuran Digital Arsip. Silakan login untuk melanjutkan.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="anda@surdi.go.id"
                autoComplete="email"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                  aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-900 space-y-1">
              <p className="font-semibold">Akun demo:</p>
              <p>👑 Admin — <code className="font-mono">admin@surdi.go.id</code> / <code className="font-mono">admin123</code></p>
              <p>👤 User — <code className="font-mono">user@surdi.go.id</code> / <code className="font-mono">user123</code></p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 mt-2">
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Memproses…
                </>
              ) : (
                "Login"
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Tekan <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">Enter</kbd> untuk submit
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
