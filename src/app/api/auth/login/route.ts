import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 }
      );
    }
    const normalized = email.toLowerCase().trim();
    const user = await db.user.findUnique({ where: { email: normalized } });
    if (!user) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 }
      );
    }
    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 }
      );
    }
    await setAuthCookie({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "ADMIN" | "USER",
    });
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Login gagal" },
      { status: 500 }
    );
  }
}
