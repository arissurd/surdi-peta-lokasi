import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  // Prevent self-demotion that would leave no admin
  if (id === currentUser.id && body.role && body.role !== "ADMIN") {
    const adminCount = await db.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Tidak bisa menurunkan admin terakhir" },
        { status: 400 }
      );
    }
  }

  const data: any = {};
  if (typeof body.name === "string") data.name = body.name.trim() || null;
  if (typeof body.role === "string")
    data.role = body.role === "ADMIN" ? "ADMIN" : "USER";
  if (typeof body.email === "string") {
    const normalized = body.email.toLowerCase().trim();
    const clash = await db.user.findUnique({ where: { email: normalized } });
    if (clash && clash.id !== id) {
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 409 });
    }
    data.email = normalized;
  }
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }
    data.password = await hashPassword(body.password);
  }

  try {
    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ data: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const { id } = await params;
  if (id === currentUser.id) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus akun sendiri" },
      { status: 400 }
    );
  }
  // Prevent deleting the last admin
  const target = await db.user.findUnique({ where: { id } });
  if (target?.role === "ADMIN") {
    const adminCount = await db.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Tidak bisa menghapus admin terakhir" },
        { status: 400 }
      );
    }
  }
  try {
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Delete failed" }, { status: 500 });
  }
}
