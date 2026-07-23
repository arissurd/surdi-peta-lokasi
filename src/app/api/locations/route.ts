import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const jenis = (url.searchParams.get("jenis") || "").trim();
  const prov = (url.searchParams.get("prov") || "").trim();
  const periode = (url.searchParams.get("periode") || "").trim();
  const onlyMapped = url.searchParams.get("mapped") === "1";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  const mode = url.searchParams.get("mode") || "list"; // 'list' | 'map'

  const where: any = {};
  if (q) {
    where.OR = [
      { lokasi: { contains: q } },
      { jalanMasuk: { contains: q } },
      { provenance: { contains: q } },
      { noInventaris: { contains: q } },
      { bagian: { contains: q } },
    ];
  }
  if (jenis) where.jenis = jenis;
  if (prov) where.provenance = { contains: prov };
  if (periode) where.periode = { contains: periode };
  if (onlyMapped) {
    where.NOT = [{ latitude: null }, { longitude: null }];
  }

  // Map mode: only return locations with coords, no pagination, capped
  if (mode === "map") {
    where.NOT = [{ latitude: null }, { longitude: null }];
    const rows = await db.location.findMany({
      where,
      select: {
        id: true,
        lokasi: true,
        jalanMasuk: true,
        provenance: true,
        jenis: true,
        media: true,
        periode: true,
        bagian: true,
        latitude: true,
        longitude: true,
      },
      take: 2000,
    });
    return NextResponse.json({ markers: rows, total: rows.length });
  }

  const [rows, total] = await Promise.all([
    db.location.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.location.count({ where }),
  ]);

  return NextResponse.json({ data: rows, total, page, limit });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const created = await db.location.create({
      data: {
        provenance: body.provenance ?? null,
        jalanMasuk: body.jalanMasuk ?? null,
        periode: body.periode ?? null,
        lokasi: body.lokasi ?? null,
        jenis: body.jenis ?? null,
        media: body.media ?? null,
        nomorJumlah: body.nomorJumlah ?? null,
        bagian: body.bagian ?? null,
        pAkuisisi: body.pAkuisisi ?? null,
        pPengolahan: body.pPengolahan ?? null,
        pDigitalisasi: body.pDigitalisasi ?? null,
        pRestorasi: body.pRestorasi ?? null,
        noInventaris: body.noInventaris ?? null,
        latitude: body.latitude != null && body.latitude !== "" ? Number(body.latitude) : null,
        longitude: body.longitude != null && body.longitude !== "" ? Number(body.longitude) : null,
        address: body.address ?? body.jalanMasuk ?? null,
      },
    });
    return NextResponse.json({ data: created });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Create failed" }, { status: 500 });
  }
}
