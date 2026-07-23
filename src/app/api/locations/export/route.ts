import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import xlsx from "node-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/locations/export?[q=...]&[jenis=...]&[prov=...]&[periode=...]&[building=...]
 *
 * Exports the (filtered) Location rows to an .xlsx file with the same column
 * structure as the original db_surdi.xlsx — so the file can be re-imported
 * via the /api/locations/import endpoint without modification.
 *
 * Response: binary .xlsx with Content-Disposition attachment.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const jenis = (url.searchParams.get("jenis") || "").trim();
  const prov = (url.searchParams.get("prov") || "").trim();
  const periode = (url.searchParams.get("periode") || "").trim();
  const building = (url.searchParams.get("building") || "").trim().toUpperCase();

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
  if (building) where.lokasi = { startsWith: building + "." };

  // Stream all matching rows in chunks to avoid loading 43k rows into memory
  // at once. SQLite + Prisma handles this fine but we cap at 100k rows for safety.
  const PAGE = 5000;
  let cursor: string | undefined;
  const allRows: any[][] = [];

  // Header row (matches original db_surdi.xlsx columns, minus the unused `id`)
  const headers = [
    "provenance",
    "jalan_masuk",
    "periode",
    "lokasi",
    "jenis",
    "media",
    "nomor_jumlah",
    "bagian",
    "p_akuisisi",
    "p_pengolahan",
    "p_digitalisasi",
    "p_restorasi",
    "no_inventaris",
  ];
  allRows.push(headers);

  let total = 0;
  while (true) {
    const rows = await db.location.findMany({
      where,
      take: PAGE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        provenance: true,
        jalanMasuk: true,
        periode: true,
        lokasi: true,
        jenis: true,
        media: true,
        nomorJumlah: true,
        bagian: true,
        pAkuisisi: true,
        pPengolahan: true,
        pDigitalisasi: true,
        pRestorasi: true,
        noInventaris: true,
      },
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      allRows.push([
        r.provenance,
        r.jalanMasuk,
        r.periode,
        r.lokasi,
        r.jenis,
        r.media,
        r.nomorJumlah,
        r.bagian,
        r.pAkuisisi,
        r.pPengolahan,
        r.pDigitalisasi,
        r.pRestorasi,
        r.noInventaris,
      ]);
      total++;
    }
    cursor = rows[rows.length - 1].id;
    if (rows.length < PAGE) break;
    if (total >= 100000) break; // safety cap
  }

  // Build the xlsx buffer
  const sheetOptions = {
    "!cols": headers.map(() => ({ wch: 22 })),
  };
  const buffer = xlsx.build(
    [{ name: "tb_lokasi", data: allRows, options: sheetOptions }],
    { sheetOptions }
  );

  const today = new Date().toISOString().slice(0, 10);
  const filename = `surdi_lokasi_${today}.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
