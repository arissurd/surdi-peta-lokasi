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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F6F4]">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 border-2 border-[#BA5D5D]">
            <MapPin className="size-8 text-[#BA5D5D]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#232837]">
            SURDI
          </h1>
          <p className="mt-1 text-sm text-[#5F677C]">
            Peta Lokasi Arsip
          </p>
        </div>

        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-medium text-[#232837]">
              Login
            </CardTitle>
            <CardDescription className="text-[#8B92A5]">
              Silakan login untuk mengakses sistem.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-[#5F677C]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anda@surdi.go.id"
                  autoComplete="email"
                  required
                  autoFocus
                  className="border-[#E8E8E8] focus:border-[#BA5D5D] focus:ring-[#BA5D5D]/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-[#5F677C]">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="pr-12 border-[#E8E8E8] focus:border-[#BA5D5D] focus:ring-[#BA5D5D]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-[#F7F6F4] text-[#8B92A5]"
                    aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="border-l-2 border-[#CFD16C] bg-[#CFD16C]/10 p-3 text-xs text-[#5F677C] space-y-1">
                <p className="font-semibold text-[#232837]">Akun demo:</p>
                <p>Admin — <code className="font-mono">admin@surdi.go.id</code> / <code className="font-mono">admin123</code></p>
                <p>User — <code className="font-mono">user@surdi.go.id</code> / <code className="font-mono">user123</code></p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 mt-2">
              <Button
                type="submit"
                className="w-full bg-[#BA5D5D] hover:bg-[#A04D4D] text-white"
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
            </CardFooter>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-[#8B92A5]">
          Sistem Penelusuran Digital Arsip
        </p>
      </div>
    </div>
  );
}
