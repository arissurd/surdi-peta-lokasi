import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const loc = await db.location.findUnique({ where: { id } });
  if (!loc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: loc });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const data: any = {};
  for (const k of [
    "provenance", "jalanMasuk", "periode", "lokasi", "jenis", "media",
    "nomorJumlah", "bagian", "pAkuisisi", "pPengolahan", "pDigitalisasi",
    "pRestorasi", "noInventaris", "address",
  ]) {
    if (k in body) data[k] = body[k] === "" ? null : body[k];
  }
  if ("latitude" in body) data.latitude = body.latitude === "" || body.latitude == null ? null : Number(body.latitude);
  if ("longitude" in body) data.longitude = body.longitude === "" || body.longitude == null ? null : Number(body.longitude);
  try {
    const updated = await db.location.update({ where: { id }, data });
    return NextResponse.json({ data: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await db.location.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Delete failed" }, { status: 500 });
  }
}
