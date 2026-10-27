import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/locations/by-code?code=G2.R1
 * Returns all archive rows that share the same lokasi code.
 * Uses MySQL case-insensitive LIKE (default collation is utf8mb4_unicode_ci).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Parameter `code` wajib diisi" }, { status: 400 });
  }

  const rows = await db.location.findMany({
    where: {
      OR: [
        { lokasi: { equals: code } },
        { lokasi: { startsWith: code + "." } },
      ],
    },
    select: {
      id: true,
      lokasi: true,
      jalanMasuk: true,
      provenance: true,
      periode: true,
      jenis: true,
      media: true,
      nomorJumlah: true,
      bagian: true,
      noInventaris: true,
    },
    take: 500,
    orderBy: { lokasi: "asc" },
  });

  return NextResponse.json({
    code,
    count: rows.length,
    data: rows,
  });
}
