import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, setAuthCookie, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const normalized = email.toLowerCase().trim();
    const existing = await db.user.findUnique({ where: { email: normalized } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    const hash = await hashPassword(password);
    const user = await db.user.create({
      data: { email: normalized, password: hash, name: name?.trim() || null, role: "USER" },
    });
    await setAuthCookie({ id: user.id, email: user.email, name: user.name, role: "USER" });
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Registration failed" }, { status: 500 });
  }
}
